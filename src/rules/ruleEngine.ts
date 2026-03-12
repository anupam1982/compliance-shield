import { ComplianceViolation } from "../types/rules";
import { defaultRules } from "./defaultRules";

export interface PullRequestFileForScan {
  filename: string;
  patch?: string;
}

export function runComplianceChecks(
  files: PullRequestFileForScan[]
): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];

  for (const file of files) {
    const lowerFileName = file.filename.toLowerCase();

    for (const bannedFileIndicator of defaultRules.bannedFileIndicators) {
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

    for (const bannedContentIndicator of defaultRules.bannedContentIndicators) {
      if (patchContent.includes(bannedContentIndicator)) {
        violations.push({
          type: "content",
          fileName: file.filename,
          indicator: bannedContentIndicator,
          message: `Patch content contains banned indicator \`${bannedContentIndicator}\`.`
        });
      }
    }
  }

  return violations;
}