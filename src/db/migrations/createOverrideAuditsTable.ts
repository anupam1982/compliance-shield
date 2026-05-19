import { getPostgresPool } from "../postgres";

export async function createOverrideAuditsTable(): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists override_audits (
      id uuid primary key default gen_random_uuid(),

      owner text not null,
      repo text not null,

      pr_number integer not null,

      approved_by text not null,

      reason text not null,

      risk_score integer,

      created_at timestamptz not null default now()
    );

    create index if not exists idx_override_audits_repo
    on override_audits(owner, repo);

    create index if not exists idx_override_audits_created_at
    on override_audits(created_at desc);
  `);
}
