import { getPostgresPool } from "../db/postgres";

export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  database: "ok" | "disabled" | "error";
  timestamp: string;
}

export async function getHealthStatus(): Promise<HealthCheckResult> {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      status: "healthy",
      database: "disabled",
      timestamp: new Date().toISOString()
    };
  }

  try {
    await pool.query("select 1");

    return {
      status: "healthy",
      database: "ok",
      timestamp: new Date().toISOString()
    };
  } catch {
    return {
      status: "unhealthy",
      database: "error",
      timestamp: new Date().toISOString()
    };
  }
}