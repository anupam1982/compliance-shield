import { Pool } from "pg";
import { getPostgresPool } from "../postgres";

export async function runUsageEventsMigration(
): Promise<void> {
    const pool = getPostgresPool();

    if (!pool) {
      return;
    }
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id BIGSERIAL PRIMARY KEY,

      installation_id BIGINT NOT NULL,
      account_login TEXT NOT NULL,

      owner TEXT NOT NULL,
      repo TEXT NOT NULL,

      event_type TEXT NOT NULL,

      metadata JSONB DEFAULT '{}'::jsonb,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_installation
    ON usage_events(installation_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_account
    ON usage_events(account_login);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_repo
    ON usage_events(owner, repo);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_event_type
    ON usage_events(event_type);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usage_events_created_at
    ON usage_events(created_at DESC);
  `);

  console.log(
    "✅ usage_events migration completed"
  );
}