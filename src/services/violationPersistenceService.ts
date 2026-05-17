import { getPostgresPool } from "../db/postgres";
import { ComplianceViolation } from "../types/rules";

export async function persistViolations(
  scanMetricId: number,
  violations: ComplianceViolation[]
): Promise<void> {
  const pool = getPostgresPool();

  if (!pool || violations.length === 0) {
    return;
  }

  for (const violation of violations) {
    await pool.query(
      `
      insert into scan_violations (
        scan_metric_id,
        file_name,
        line_number,
        severity,
        indicator,
        message,
        suggested_fix
      )
      values ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        scanMetricId,
        violation.fileName,
        violation.line ?? null,
        violation.severity,
        violation.indicator ?? null,
        violation.message,
        violation.suggestedFix ?? null
      ]
    );
  }
}