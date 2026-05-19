import { getPostgresPool } from "../postgres";

export async function updateOverrideAuditsTable(): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    alter table override_audits
    add column if not exists expires_at timestamptz;

    alter table override_audits
    add column if not exists status text not null default 'ACTIVE';
  `);
}