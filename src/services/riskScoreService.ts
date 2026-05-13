import { ComplianceViolation } from "../types/rules";

export interface RiskScoreResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
}

export function calculateRiskScore(
  violations: ComplianceViolation[]
): RiskScoreResult {
  let score = 0;

  for (const violation of violations) {
    switch (violation.severity) {
      case "low":
        score += 5;
        break;

      case "medium":
        score += 15;
        break;

      case "high":
        score += 30;
        break;

      case "critical":
        score += 50;
        break;
    }

    if (violation.type === "secret-pattern") {
      score += 20;
    }
  }

  score = Math.min(score, 100);

  let level: RiskScoreResult["level"];

  if (score >= 80) {
    level = "critical";
  } else if (score >= 50) {
    level = "high";
  } else if (score >= 20) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score,
    level
  };
}