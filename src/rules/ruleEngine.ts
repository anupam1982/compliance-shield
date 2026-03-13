import { ComplianceRuleSet, ComplianceViolation } from "../types/rules";

export interface PullRequestFileForScan {
  filename: string;
  patch?: string;
}

export function runComplianceChecks(
  files: PullRequestFileForScan[],
  rules: ComplianceRuleSet
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  for (const file of files) {
    const lowerFileName = file.filename.toLowerCase();

    for (const bannedFileIndicator of rules.bannedFileIndicators) {
      if (lowerFileName.includes(bannedFileIndicator.toLowerCase())) {
        violations.push({
          type: "file",
          fileName: file.filename,
          indicator: bannedFileIndicator,
          message: `Filename contains banned indicator \`${bannedFileIndicator}\`.`
        });
      }
    }

    const patchContent = file.patch ?? "";

    for (const bannedContentIndicator of rules.bannedContentIndicators) {
      if (patchContent.includes(bannedContentIndicator)) {
        violations.push({
          type: "content",
          fileName: file.filename,
          indicator: bannedContentIndicator,
          message: `Patch content contains banned indicator \`${bannedContentIndicator}\`.`
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
            message: `Patch content matched secret pattern \`${secretPattern.name}\`.`
          });
        }
      } catch {
        violations.push({
          type: "secret-pattern",
          fileName: file.filename,
          indicator: secretPattern.name,
          message: `Invalid regex pattern configured for \`${secretPattern.name}\`.`
        });
      }
    }
  }

  return violations;
}