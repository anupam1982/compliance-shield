import {
  CommandPermissionLevel,
  CommandPermissions,
  ComplianceConfigFile,
  PolicyName,
  ScanMode,
  SeverityLevel
} from "../types/rules";

const validSeverities: SeverityLevel[] = ["low", "medium", "high", "critical"];
const validScanModes: ScanMode[] = ["diff", "full-file"];
const validPolicies: PolicyName[] = ["baseline", "strict", "secrets-only", "crypto"];
const validPermissions: CommandPermissionLevel[] = ["everyone", "write", "admin"];

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateCommandPermissions(value: unknown): string[] {
  const errors: string[] = [];

  if (typeof value !== "object" || value === null) {
    return ["commandPermissions must be an object"];
  }

  const permissions = value as Partial<CommandPermissions>;

  const entries: Array<[keyof CommandPermissions, unknown]> = [
    ["help", permissions.help],
    ["status", permissions.status],
    ["scan-repo", permissions["scan-repo"]],
    ["rescan", permissions.rescan]
  ];

  for (const [key, permission] of entries) {
    if (
      permission !== undefined &&
      (typeof permission !== "string" ||
        !validPermissions.includes(permission as CommandPermissionLevel))
    ) {
      errors.push(
        `commandPermissions.${key} must be one of: ${validPermissions.join(", ")}`
      );
    }
  }

  return errors;
}

export function validateComplianceConfig(
  config: ComplianceConfigFile | undefined
): ConfigValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    return { isValid: true, errors: [] };
  }

  if (
    config.policy !== undefined &&
    (typeof config.policy !== "string" || !validPolicies.includes(config.policy))
  ) {
    errors.push(`policy must be one of: ${validPolicies.join(", ")}`);
  }

  if (
    config.minimumSeverityToFail !== undefined &&
    (typeof config.minimumSeverityToFail !== "string" ||
      !validSeverities.includes(config.minimumSeverityToFail))
  ) {
    errors.push(`minimumSeverityToFail must be one of: ${validSeverities.join(", ")}`);
  }

  if (
    config.scanMode !== undefined &&
    (typeof config.scanMode !== "string" || !validScanModes.includes(config.scanMode))
  ) {
    errors.push(`scanMode must be one of: ${validScanModes.join(", ")}`);
  }

  if (config.ignorePaths !== undefined && !isStringArray(config.ignorePaths)) {
    errors.push("ignorePaths must be an array of strings");
  }

  if (config.ignoreIndicators !== undefined && !isStringArray(config.ignoreIndicators)) {
    errors.push("ignoreIndicators must be an array of strings");
  }

  if (
    config.inlineIgnoreComment !== undefined &&
    typeof config.inlineIgnoreComment !== "string"
  ) {
    errors.push("inlineIgnoreComment must be a string");
  }

  const numericFields: Array<[string, unknown]> = [
    ["maxRepositoryFiles", config.maxRepositoryFiles],
    ["maxFileSizeKB", config.maxFileSizeKB],
    ["parallelFileFetchLimit", config.parallelFileFetchLimit]
  ];

  for (const [name, value] of numericFields) {
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    ) {
      errors.push(`${name} must be a positive number`);
    }
  }

  if (config.commandPermissions !== undefined) {
    errors.push(...validateCommandPermissions(config.commandPermissions));
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}