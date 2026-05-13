import { Pool } from "pg";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

export function getPostgresPool(): Pool | null {
  console.log("🔥 getPostgresPool invoked");
console.log("METRICS_ENABLED =", process.env.METRICS_ENABLED);
console.log("DATABASE_URL exists =", !!process.env.DATABASE_URL);
  console.log("METRICS_ENABLED =", process.env.METRICS_ENABLED);
  console.log("DATABASE_URL exists =", !!process.env.DATABASE_URL);
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