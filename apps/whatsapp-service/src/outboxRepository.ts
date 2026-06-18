import type pg from "pg";
import { logger } from "./logger.js";

export interface OutboxRow {
  id: string;
  tenant_id: string;
  channel: string;
  recipient_phone_e164: string;
  template_key: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
}

export class OutboxRepository {
  constructor(private pool: pg.Pool) {}

  async recoverExpiredProcessingRows(processingTimeoutSeconds: number): Promise<number> {
    const sql = `
      UPDATE internal.message_outbox
      SET status = 'failed',
          failed_at = NOW(),
          last_error = 'processing timeout after max attempts',
          processing_at = NULL
      WHERE channel = 'whatsapp'
        AND status = 'processing'
        AND processing_at < NOW() - ($1 || ' seconds')::interval
        AND attempts >= max_attempts
    `;
    const result = await this.pool.query(sql, [processingTimeoutSeconds]);
    const recoveredCount = result.rowCount ?? 0;
    if (recoveredCount > 0) {
      logger.warn({ count: recoveredCount }, "recovered expired processing rows");
    }
    return recoveredCount;
  }

  async claimBatch(
    batchSize: number,
    processingTimeoutSeconds: number,
  ): Promise<OutboxRow[]> {
    const sql = `
      WITH claimed AS (
        SELECT id
        FROM internal.message_outbox
        WHERE channel = 'whatsapp'
          AND attempts < max_attempts
          AND (
            (status = 'pending' AND scheduled_at <= NOW())
            OR
            (status = 'processing' AND processing_at < NOW() - ($2 || ' seconds')::interval)
          )
        ORDER BY scheduled_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE internal.message_outbox
      SET status = 'processing',
          attempts = attempts + 1,
          processing_at = NOW()
      FROM claimed
      WHERE internal.message_outbox.id = claimed.id
      RETURNING internal.message_outbox.*;
    `;

    const result = await this.pool.query(sql, [batchSize, processingTimeoutSeconds]);

    return result.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      channel: row.channel,
      recipient_phone_e164: row.recipient_phone_e164,
      template_key: row.template_key,
      payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      attempts: row.attempts,
      max_attempts: row.max_attempts,
    }));
  }

  async markSent(id: string, providerMessageId: string): Promise<void> {
    const sql = `
      UPDATE internal.message_outbox
      SET status = 'sent',
          sent_at = NOW(),
          provider_message_id = $1,
          last_error = NULL,
          processing_at = NULL
      WHERE id = $2 AND status = 'processing'
    `;
    const result = await this.pool.query(sql, [providerMessageId, id]);
    if (result.rowCount === 0) {
      logger.warn({ outboxId: id }, "markSent: row not found or not in processing status");
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const sql = `
      UPDATE internal.message_outbox
      SET status = 'failed',
          failed_at = NOW(),
          last_error = $1,
          processing_at = NULL
      WHERE id = $2 AND status = 'processing'
    `;
    const result = await this.pool.query(sql, [error, id]);
    if (result.rowCount === 0) {
      logger.warn({ outboxId: id }, "markFailed: row not found or not in processing status");
    }
  }

  async markRetry(id: string, error: string, retryDelaySeconds: number): Promise<void> {
    const sql = `
      UPDATE internal.message_outbox
      SET status = 'pending',
          scheduled_at = NOW() + ($1 || ' seconds')::interval,
          last_error = $2,
          processing_at = NULL
      WHERE id = $3 AND status = 'processing'
    `;
    const result = await this.pool.query(sql, [retryDelaySeconds, error, id]);
    if (result.rowCount === 0) {
      logger.warn({ outboxId: id }, "markRetry: row not found or not in processing status");
    }
  }
}
