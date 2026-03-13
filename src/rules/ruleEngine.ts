import { ComplianceRuleSet, ComplianceViolation, SeverityLevel } from "../types/rules";

export interface PullRequestFileForScan {
  filename: string;
  patch?: string;
}

export function getSeverityRank(severity: SeverityLevel): number {
  switch (severity) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

export function hasBlockingViolations(
  violations: ComplianceViolation[],
  minimumSeverityToFail: SeverityLevel
): boolean {
  const threshold = getSeverityRank(minimumSeverityToFail);
  return violations.some((violation) => getSeverityRank(violation.severity) >= threshold);
}

export function runComplianceChecks(
  files: PullRequestFileForScan[],
  rules: ComplianceRuleSet
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  for (const file of files) {
    const lowerFileName = file.filename.toLowerCase();

    for (const indicatorRule of rules.bannedFileIndicators) {
      if (lowerFileName.includes(indicatorRule.value.toLowerCase())) {
        violations.push({
          type: "file",
          fileName: file.filename,
          indicator: indicatorRule.value,
          severity: indicatorRule.severity,
          message: `Filename contains banned indicator \`${indicatorRule.value}\`.`
        });
      }
    }

    const patchContent = file.patch ?? "";

    for (const indicatorRule of rules.bannedContentIndicators) {
      if (patchContent.includes(indicatorRule.value)) {
        violations.push({
          type: "content",
          fileName: file.filename,
          indicator: indicatorRule.value,
          severity: indicatorRule.severity,
          message: `Patch content contains banned indicator \`${indicatorRule.value}\`.`
        });
      }
    }

    for (const secretPattern of rules.secretPatterns) {
      try {
        const regex = new RegExp(secretPattern.pattern, "g");
        const matches = patchContent.match(regex);

        if (matches && matches.length > 0) {
          violations.push({
            type: "secret-pattern",
            fileName: file.filename,
            indicator: secretPattern.name,
            severity: secretPattern.severity,
            message: `Patch content matched secret pattern \`${secretPattern.name}\`.`
          });
        }
      } catch {
        violations.push({
          type: "secret-pattern",
          fileName: file.filename,
          indicator: secretPattern.name,
          severity: "medium",
          message: `Invalid regex pattern configured for \`${secretPattern.name}\`.`
        });
      }
    }
  }

  return violations;
}