import { getPostgresPool } from "../postgres";

export async function updateScanMetricsTable(): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    alter table scan_metrics
    add column if not exists installation_id bigint;

    alter table scan_metrics
    add column if not exists account_login text;
  `);
}