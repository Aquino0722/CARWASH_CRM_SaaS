import pg from "pg";
import { config } from "./config.js";
import { logger } from "./logger.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on("error", (err) => {
  logger.error(err, "unexpected pool error");
});

export async function closeDb(): Promise<void> {
  await pool.end();
}
