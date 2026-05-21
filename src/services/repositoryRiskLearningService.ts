import { getPostgresPool } from "../db/postgres";

export async function getMostRiskyRepositories() {
  const pool = getPostgresPool();
  if (!pool) return [];

  const result = await pool.query(`
    select
      owner,
      repo,
      round(avg(risk_score))::int as avg_risk,
      max(risk_score)::int as max_risk,
      count(*)::int as total_scans
    from scan_metrics
    group by owner, repo
    order by avg_risk desc, max_risk desc
    limit 10
  `);

  return result.rows;
}

export async function getImprovingRepositories() {
  const pool = getPostgresPool();
  if (!pool) return [];

  const result = await pool.query(`
    with ranked as (
      select
        owner,
        repo,
        risk_score,
        created_at,
        row_number() over (
          partition by owner, repo
          order by created_at desc
        ) as rn
      from scan_metrics
    )
    select
      latest.owner,
      latest.repo,
      previous.risk_score::int as previous_risk,
      latest.risk_score::int as latest_risk,
      (previous.risk_score - latest.risk_score)::int as improvement
    from ranked latest
    join ranked previous
      on latest.owner = previous.owner
      and latest.repo = previous.repo
    where latest.rn = 1
      and previous.rn = 2
      and latest.risk_score < previous.risk_score
    order by improvement desc
    limit 10
  `);

  return result.rows;
}

export async function getRecurringViolations() {
  const pool = getPostgresPool();
  if (!pool) return [];

  const result = await pool.query(`
    select
      severity,
      indicator,
      count(*)::int as occurrences
    from scan_violations
    group by severity, indicator
    order by occurrences desc
    limit 15
  `);

  return result.rows;
}

export async function getRepositoryRiskTrend() {
  const pool = getPostgresPool();
  if (!pool) return [];

  const result = await pool.query(`
    select
      date_trunc('day', created_at) as day,
      round(avg(risk_score))::int as avg_risk
    from scan_metrics
    group by day
    order by day asc
  `);

  return result.rows;
}

export async function getGovernanceDrift() {
  const pool = getPostgresPool();
  if (!pool) return [];

  const result = await pool.query(`
    select
      owner,
      repo,
      count(*)::int as override_count,
      round(avg(risk_score))::int as avg_risk
    from override_audits
    group by owner, repo
    order by override_count desc, avg_risk desc
    limit 10
  `);

  return result.rows;
}