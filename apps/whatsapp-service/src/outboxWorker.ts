import type { OutboxRepository } from "./outboxRepository.js";
import type { WhatsAppProvider } from "./providers/WhatsAppProvider.js";
import type { Logger } from "pino";
import { maskPhone } from "./phone.js";

interface WorkerConfig {
  pollIntervalMs: number;
  batchSize: number;
  retryDelaySeconds: number;
  processingTimeoutSeconds: number;
}

export class OutboxWorker {
  private running = false;
  private currentRun: Promise<void> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private resolveCurrentRun: (() => void) | null = null;

  constructor(
    private config: WorkerConfig,
    private outboxRepo: OutboxRepository,
    private provider: WhatsAppProvider,
    private logger: Logger,
  ) {}

  start(): void {
    this.running = true;
    this.logger.info("whatsapp outbox worker starting");

    this.currentRun = new Promise((resolve) => {
      this.resolveCurrentRun = resolve;
    });

    this.poll();
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.finishRun();
    }

    if (this.currentRun) {
      await this.currentRun;
    }
  }

  private poll(): void {
    if (!this.running) {
      this.finishRun();
      return;
    }

    this.pollAsync().catch((err) => {
      this.logger.error(err, "poll cycle failed");
      this.scheduleNext();
    });
  }

  private async pollAsync(): Promise<void> {
    await this.outboxRepo.recoverExpiredProcessingRows(this.config.processingTimeoutSeconds);

    const rows = await this.outboxRepo.claimBatch(
      this.config.batchSize,
      this.config.processingTimeoutSeconds,
    );

    if (rows.length === 0) {
      this.logger.debug("no pending outbox rows");
      this.scheduleNext();
      return;
    }

    for (const row of rows) {
      const maskedPhone = maskPhone(row.recipient_phone_e164);
      this.logger.info(
        { outboxId: row.id, tenantId: row.tenant_id, templateKey: row.template_key, recipient: maskedPhone },
        "processing outbox record",
      );

      try {
        const providerMessageId = await this.provider.sendMessage({
          recipientPhoneE164: row.recipient_phone_e164,
          templateKey: row.template_key,
          payload: row.payload,
        });

        await this.outboxRepo.markSent(row.id, providerMessageId);
        this.logger.info({ outboxId: row.id, providerMessageId }, "outbox record sent");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (row.attempts >= row.max_attempts) {
          await this.outboxRepo.markFailed(row.id, message);
          this.logger.error(
            { outboxId: row.id, attempts: row.attempts, maxAttempts: row.max_attempts },
            "outbox record failed permanently",
          );
        } else {
          await this.outboxRepo.markRetry(row.id, message, this.config.retryDelaySeconds);
          this.logger.warn(
            { outboxId: row.id, attempts: row.attempts, retryInSeconds: this.config.retryDelaySeconds },
            "outbox record will retry",
          );
        }
      }
    }

    if (rows.length >= this.config.batchSize && this.running) {
      process.nextTick(() => this.poll());
    } else {
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    if (!this.running) {
      this.finishRun();
      return;
    }
    this.timer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private finishRun(): void {
    if (this.resolveCurrentRun) {
      this.resolveCurrentRun();
      this.resolveCurrentRun = null;
    }
    this.currentRun = null;
  }
}
