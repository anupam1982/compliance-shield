import { ComplianceViolation } from "../types/rules";

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function calculateSeverityCounts(
  violations: ComplianceViolation[]
): SeverityCounts {
  return violations.reduce(
    (counts, violation) => {
      counts[violation.severity] += 1;
      return counts;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  );
}

export function calculateRepositoryRiskScore(
  counts: SeverityCounts
): number {
  const weightedRisk =
    counts.critical * 40 +
    counts.high * 25 +
    counts.medium * 10 +
    counts.low * 3;

  return Math.min(weightedRisk, 100);
}