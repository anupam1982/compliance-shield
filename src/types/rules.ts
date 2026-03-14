export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type ScanMode = "diff" | "full-file";
export type PolicyName = "baseline" | "strict" | "secrets-only" | "crypto";
export type CommandPermissionLevel = "everyone" | "write" | "admin";

export interface SecretPatternRule {
  name: string;
  pattern: string;
  severity: SeverityLevel;
}

export interface ContentIndicatorRule {
  value: string;
  severity: SeverityLevel;
}

export interface FileIndicatorRule {
  value: string;
  severity: SeverityLevel;
}

export interface CommandPermissions {
  help: CommandPermissionLevel;
  status: CommandPermissionLevel;
  "scan-repo": CommandPermissionLevel;
  rescan: CommandPermissionLevel;
}

export interface ComplianceRuleSet {
  bannedFileIndicators: FileIndicatorRule[];
  bannedContentIndicators: ContentIndicatorRule[];
  secretPatterns: SecretPatternRule[];
  minimumSeverityToFail: SeverityLevel;
  ignorePaths: string[];
  ignoreIndicators: string[];
  inlineIgnoreComment: string;
  scanMode: ScanMode;
  maxRepositoryFiles: number;
  maxFileSizeKB: number;
  parallelFileFetchLimit: number;
  commandPermissions: CommandPermissions;
}

export interface ComplianceConfigFile extends Partial<ComplianceRuleSet> {
  policy?: PolicyName;
}

export interface ComplianceViolation {
  type: "file" | "content" | "secret-pattern";
  fileName: string;
  indicator: string;
  severity: SeverityLevel;
  message: string;
  line?: number;
}