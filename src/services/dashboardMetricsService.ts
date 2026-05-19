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

export async function getSeverityAnalytics() {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
  }

  const result = await pool.query(`
    select
      coalesce(sum(critical_count), 0)::int as critical,
      coalesce(sum(high_count), 0)::int as high,
      coalesce(sum(medium_count), 0)::int as medium,
      coalesce(sum(low_count), 0)::int as low
    from scan_metrics
  `);

  return result.rows[0];
}

export async function getRiskAnalytics() {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(`
    select
      owner,
      repo,
      max(risk_score)::int as max_risk_score,
      round(avg(risk_score))::int as avg_risk_score,
      max(created_at) as last_scan_at
    from scan_metrics
    group by owner, repo
    order by max_risk_score desc
  `);

  return result.rows;
}

export async function getScanDetails(
  scanId: number
) {
  const pool = getPostgresPool();

  if (!pool) {
    return null;
  }

  const scanResult = await pool.query(
    `
    select *
    from scan_metrics
    where id = $1
    `,
    [scanId]
  );

  if (scanResult.rows.length === 0) {
    return null;
  }

  const violationsResult = await pool.query(
    `
    select
      id,
      file_name,
      line_number,
      severity,
      indicator,
      message,
      suggested_fix,
      created_at
    from scan_violations
    where scan_metric_id = $1
    order by severity desc
    `,
    [scanId]
  );

  return {
    scan: scanResult.rows[0],
    violations: violationsResult.rows
  };
}

export async function getRepositoryRiskLeaderboard() {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(`
    select
      owner,
      repo,
      count(*)::int as total_scans,
      max(risk_score)::int as max_risk_score,
      round(avg(risk_score))::int as avg_risk_score,
      sum(critical_count)::int as critical_findings,
      sum(high_count)::int as high_findings,
      sum(violations_found)::int as total_violations,
      max(created_at) as last_scan_at
    from scan_metrics
    group by owner, repo
    order by max_risk_score desc, critical_findings desc, high_findings desc
  `);

  return result.rows;
}
export async function getOrgPostureSummary() {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      governanceScore: 100,
      riskLevel: "LOW",
      totalRepos: 0,
      criticalRepos: 0,
      totalViolations: 0,
      totalCritical: 0,
      totalHigh: 0,
      executiveSummary: "No scan data available yet."
    };
  }

  const result = await pool.query(`
    select
      count(distinct owner || '/' || repo)::int as total_repos,
      coalesce(sum(violations_found), 0)::int as total_violations,
      coalesce(sum(critical_count), 0)::int as total_critical,
      coalesce(sum(high_count), 0)::int as total_high,
      coalesce(max(risk_score), 0)::int as max_risk_score,
      coalesce(round(avg(risk_score)), 0)::int as avg_risk_score
    from scan_metrics
  `);

  const criticalReposResult = await pool.query(`
    select count(*)::int as critical_repos
    from (
      select owner, repo, max(risk_score) as max_risk
      from scan_metrics
      group by owner, repo
      having max(risk_score) >= 80
    ) risky_repos
  `);

  const row = result.rows[0];
  const criticalRepos = criticalReposResult.rows[0].critical_repos;

  const governanceScore = Math.max(
    0,
    100 - Number(row.avg_risk_score)
  );

  let riskLevel = "LOW";

  if (Number(row.max_risk_score) >= 80) {
    riskLevel = "CRITICAL";
  } else if (Number(row.max_risk_score) >= 60) {
    riskLevel = "HIGH";
  } else if (Number(row.max_risk_score) >= 30) {
    riskLevel = "MEDIUM";
  }

  const executiveSummary =
    riskLevel === "CRITICAL"
      ? "Critical governance risk detected. Immediate remediation is recommended for high-risk repositories."
      : riskLevel === "HIGH"
        ? "High governance risk detected. Security teams should prioritize critical and high-severity findings."
        : riskLevel === "MEDIUM"
          ? "Moderate governance risk detected. Continued remediation and monitoring is recommended."
          : "Current repository governance posture appears healthy.";

  return {
    governanceScore,
    riskLevel,
    totalRepos: row.total_repos,
    criticalRepos,
    totalViolations: row.total_violations,
    totalCritical: row.total_critical,
    totalHigh: row.total_high,
    executiveSummary
  };
}

export async function getRecentOverrides() {
  const pool = getPostgresPool();

  if (!pool) {
    return [];
  }

  const result = await pool.query(`
    select *
    from override_audits
    order by created_at desc
    limit 20
  `);

  return result.rows;
}

export async function getOverrideGovernanceSummary() {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      activeOverrides: 0,
      expiredOverrides: 0,
      totalOverrides: 0
    };
  }

  const result = await pool.query(`
    select
      count(*)::int as total_overrides,

      count(*) filter (
        where status = 'ACTIVE'
      )::int as active_overrides,

      count(*) filter (
        where status = 'EXPIRED'
      )::int as expired_overrides

    from override_audits
  `);

  return result.rows[0];
}

export async function getGovernanceDebtScore() {
  const pool = getPostgresPool();

  if (!pool) {
    return {
      debtScore: 0,
      level: "LOW"
    };
  }

  const result = await pool.query(`
    select
      count(*) filter (
        where status = 'ACTIVE'
      )::int as active,

      count(*) filter (
        where status = 'EXPIRED'
      )::int as expired,

      coalesce(avg(risk_score), 0)::int as avg_risk

    from override_audits
  `);

  const row = result.rows[0];

  const debtScore = Math.min(
    100,
    row.active * 10 +
      row.expired * 20 +
      row.avg_risk
  );

  const level =
    debtScore >= 80
      ? "CRITICAL"
      : debtScore >= 60
      ? "HIGH"
      : debtScore >= 30
      ? "MEDIUM"
      : "LOW";

  return {
    debtScore,
    level
  };
}