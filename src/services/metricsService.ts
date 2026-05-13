import { getPostgresPool } from "../db/postgres";
import { logger } from "../utils/logger";

export interface ScanMetricInput {
  owner: string;
  repo: string;
  scanType: "pr" | "repo" | "scheduled";
  prNumber?: number;
  scanMode: string;
  violationsFound: number;
  scannedFiles: number;
  skippedFiles?: number;
  durationMs: number;
  triggeredBy?: string;
}

export async function recordScanMetric(input: ScanMetricInput): Promise<void> {
  console.log("🚀 recordScanMetric CALLED");
console.log(input);
  const pool = getPostgresPool();

  if (!pool) {
    logger.debug(
      { event: "metrics.skipped", reason: "metrics_disabled" },
      "Metrics recording skipped"
    );
    return;
  }

  try {
    await pool.query(
      `
      insert into scan_metrics (
        owner,
        repo,
        scan_type,
        pr_number,
        scan_mode,
        violations_found,
        scanned_files,
        skipped_files,
        duration_ms,
        triggered_by
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        input.owner,
        input.repo,
        input.scanType,
        input.prNumber ?? null,
        input.scanMode,
        input.violationsFound,
        input.scannedFiles,
        input.skippedFiles ?? 0,
        input.durationMs,
        input.triggeredBy ?? null
      ]
    );

    logger.info(
      {
        event: "metrics.scan.recorded",
        repo: `${input.owner}/${input.repo}`,
        scanType: input.scanType,
        violations: input.violationsFound,
        durationMs: input.durationMs
      },
      "Scan metric recorded"
    );
  } catch (error) {
    logger.error(
      {
        event: "metrics.scan.failed",
        repo: `${input.owner}/${input.repo}`,
        error
      },
      "Failed to record scan metric"
    );
  }
}