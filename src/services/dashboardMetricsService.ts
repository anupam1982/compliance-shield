import { getPostgresPool } from "../db/postgres";

export async function getRecentScans(limit = 20) {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(
    `
    select
      id,
      owner,
      repo,
      scan_type,
      pr_number,
      scan_mode,
      violations_found,
      scanned_files,
      skipped_files,
      duration_ms,
      triggered_by,
      created_at
    from scan_metrics
    order by created_at desc
    limit $1
    `,
    [limit]
  );

  return result.rows;
}

export async function getRepositorySummary() {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(`
    select
      owner,
      repo,
      count(*)::int as total_scans,
      max(created_at) as last_scan_at,
      sum(violations_found)::int as total_violations,
      round(avg(duration_ms))::int as avg_duration_ms
    from scan_metrics
    group by owner, repo
    order by last_scan_at desc
  `);

  return result.rows;
}

export async function getScanTrends(days = 14) {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(
    `
    select
      date_trunc('day', created_at)::date as scan_date,
      count(*)::int as scans,
      sum(violations_found)::int as violations
    from scan_metrics
    where created_at >= now() - ($1 || ' days')::interval
    group by scan_date
    order by scan_date asc
    `,
    [days]
  );

  return result.rows;
}

export async function getDashboardSummary() {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      totalScans: 0,
      totalViolations: 0,
      repositories: 0,
      avgDurationMs: 0
    };
  }

  const result = await pool.query(`
    select
      count(*)::int as total_scans,
      coalesce(sum(violations_found), 0)::int as total_violations,
      count(distinct owner || '/' || repo)::int as repositories,
      coalesce(round(avg(duration_ms)), 0)::int as avg_duration_ms
    from scan_metrics
  `);

  const row = result.rows[0];

  return {
    totalScans: row.total_scans,
    totalViolations: row.total_violations,
    repositories: row.repositories,
    avgDurationMs: row.avg_duration_ms
  };
}