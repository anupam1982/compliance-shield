import { getPostgresPool } from "../db/postgres";

interface OverrideAuditInput {
  owner: string;
  repo: string;
  prNumber: number;
  approvedBy: string;
  reason: string;
  riskScore?: number;
  expiresAt?: Date;
  status?: "ACTIVE" | "EXPIRED";
}

export async function recordOverrideAudit(
  input: OverrideAuditInput
): Promise<void> {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(
    `
      insert into override_audits (
        owner,
        repo,
        pr_number,
        approved_by,
        reason,
        risk_score,
        expires_at,
        status
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      input.owner,
      input.repo,
      input.prNumber,
      input.approvedBy,
      input.reason,
      input.riskScore ?? null,
      input.expiresAt ?? null,
      input.status ?? "ACTIVE"
    ]
  );
}