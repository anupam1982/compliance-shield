export interface ComplianceRuleSet {
  bannedFileIndicators: string[];
  bannedContentIndicators: string[];
}

export interface ComplianceViolation {
  type: "file" | "content";
  fileName: string;
  indicator: string;
  message: string;
}