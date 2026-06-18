import "dotenv/config";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10),
  batchSize: parseInt(process.env.WORKER_BATCH_SIZE ?? "10", 10),
  retryDelaySeconds: parseInt(process.env.WORKER_RETRY_DELAY_SECONDS ?? "60", 10),
  processingTimeoutSeconds: parseInt(process.env.WORKER_PROCESSING_TIMEOUT_SECONDS ?? "300", 10),
  logLevel: process.env.LOG_LEVEL ?? "info",
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "mock",
  mockFailRate: parseFloat(process.env.MOCK_PROVIDER_FAIL_RATE ?? "0"),
};

if (!config.databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
