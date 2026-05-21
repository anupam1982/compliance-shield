import { getPostgresPool } from "../postgres";

export async function updateUsageEventsTable(): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    ALTER TABLE usage_events
    ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
  `);
  
  await pool.query(`
    ALTER TABLE usage_events
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
  `);
  
  await pool.query(`
    ALTER TABLE usage_events
    ADD COLUMN IF NOT EXISTS tenant_id TEXT;
  `);
}