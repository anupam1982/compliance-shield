import { getPostgresPool } from "../db/postgres";

export interface UsageEventInput {
  installationId?: number;
  accountLogin?: string;
  owner: string;
  repo: string;
  eventType: string;
  quantity?: number;
  metadata?: unknown;
}

export async function recordUsageEvent(
  input: UsageEventInput
): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(
    `
      insert into usage_events (
        installation_id,
        account_login,
        owner,
        repo,
        event_type,
        quantity,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      input.installationId ?? null,
      input.accountLogin ?? null,
      input.owner,
      input.repo,
      input.eventType,
      input.quantity ?? 1,
      input.metadata ? JSON.stringify(input.metadata) : null
    ]
  );
}