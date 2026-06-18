import { config } from "./config.js";
import { logger } from "./logger.js";
import { pool, closeDb } from "./db.js";
import { OutboxRepository } from "./outboxRepository.js";
import { MockWhatsAppProvider } from "./providers/MockWhatsAppProvider.js";
import { OutboxWorker } from "./outboxWorker.js";

async function main(): Promise<void> {
  const outboxRepo = new OutboxRepository(pool);

  let provider;
  if (config.whatsappProvider === "mock") {
    provider = new MockWhatsAppProvider(config.mockFailRate);
  } else {
    logger.error({ provider: config.whatsappProvider }, "unknown whatsapp provider");
    process.exit(1);
  }

  const worker = new OutboxWorker(
    {
      pollIntervalMs: config.pollIntervalMs,
      batchSize: config.batchSize,
      retryDelaySeconds: config.retryDelaySeconds,
      processingTimeoutSeconds: config.processingTimeoutSeconds,
    },
    outboxRepo,
    provider,
    logger,
  );

  worker.start();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    await worker.stop();
    await closeDb();
    logger.info("whatsapp outbox worker stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error(err, "fatal startup error");
  process.exit(1);
});
