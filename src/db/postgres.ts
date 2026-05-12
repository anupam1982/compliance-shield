import { Pool } from "pg";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  if (process.env.METRICS_ENABLED !== "true") {
    return null;
  }

  if (!process.env.DATABASE_URL) {
    logger.warn({ event: "db.missing_url" }, "DATABASE_URL is not configured");
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined
    });
  }

  return pool;
}