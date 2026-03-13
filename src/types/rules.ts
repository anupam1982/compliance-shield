export interface SecretPatternRule {
  name: string;
  pattern: string;
}

export interface ComplianceRuleSet {
  bannedFileIndicators: string[];
  bannedContentIndicators: string[];
  secretPatterns: SecretPatternRule[];
}

export interface ComplianceViolation {
  type: "file" | "content" | "secret-pattern";
  fileName: string;
  indicator: string;
  message: string;
}