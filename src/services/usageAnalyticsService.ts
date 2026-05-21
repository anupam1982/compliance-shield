import { getPostgresPool } from "../db/postgres";

export async function getUsageSummary() {
  const pool = getPostgresPool();

  if (!pool) return [];

  const result = await pool.query(`
    select
      coalesce(account_login, owner) as account_login,
      event_type,
      count(*)::int as event_count,
      sum(quantity)::int as total_quantity,
      max(created_at) as last_event_at
    from usage_events
    group by coalesce(account_login, owner), event_type
    order by account_login asc, event_count desc
  `);

  return result.rows;
}