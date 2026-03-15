import yaml from "js-yaml";
import { Context } from "probot";
import { defaultRules } from "../rules/defaultRules";
import { getPolicyPack } from "../rules/policyPacks";
import {
  CommandPermissionLevel,
  CommandPermissions,
  ComplianceConfigFile,
  ComplianceRuleSet,
  ContentIndicatorRule,
  FileIndicatorRule,
  PolicyName,
  ScanMode,
  SecretPatternRule,
  SeverityLevel
} from "../types/rules";
import { RepositoryContextInfo } from "../types/githubContext";
import { validateComplianceConfig } from "../utils/configValidator";

const validSeverityLevels: SeverityLevel[] = ["low", "medium", "high", "critical"];
const validScanModes: ScanMode[] = ["diff", "full-file"];
const validPolicyNames: PolicyName[] = ["baseline", "strict", "secrets-only", "crypto"];
const validPermissionLevels: CommandPermissionLevel[] = ["everyone", "write", "admin"];

function normalizeSeverity(value: unknown, fallback: SeverityLevel): SeverityLevel {
  return typeof value === "string" && validSeverityLevels.includes(value as SeverityLevel)
    ? (value as SeverityLevel)
    : fallback;
}

function normalizeScanMode(value: unknown, fallback: ScanMode): ScanMode {
  return typeof value === "string" && validScanModes.includes(value as ScanMode)
    ? (value as ScanMode)
    : fallback;
}

function normalizePolicy(value: unknown): PolicyName | undefined {
  return typeof value === "string" && validPolicyNames.includes(value as PolicyName)
    ? (value as PolicyName)
    : undefined;
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function normalizePermissionLevel(
  value: unknown,
  fallback: CommandPermissionLevel
): CommandPermissionLevel {
  return typeof value === "string" && validPermissionLevels.includes(value as CommandPermissionLevel)
    ? (value as CommandPermissionLevel)
    : fallback;
}

function normalizeCommandPermissions(
  value: unknown,
  fallback: CommandPermissions
): CommandPermissions {
  if (typeof value !== "object" || value === null) {
    return fallback;
  }

  const raw = value as Partial<CommandPermissions>;

  return {
    help: normalizePermissionLevel(raw.help, fallback.help),
    status: normalizePermissionLevel(raw.status, fallback.status),
    "scan-repo": normalizePermissionLevel(raw["scan-repo"], fallback["scan-repo"]),
    rescan: normalizePermissionLevel(raw.rescan, fallback.rescan)
  };
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter((item): item is string => typeof item === "string");
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeFileIndicators(
  value: unknown,
  fallback: FileIndicatorRule[]
): FileIndicatorRule[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => {
      if (typeof item === "string") {
        return { value: item, severity: "high" as SeverityLevel };
      }

      if (
        typeof item === "object" &&
        item !== null &&
        "value" in item &&
        typeof (item as FileIndicatorRule).value === "string"
      ) {
        return {
          value: (item as FileIndicatorRule).value,
          severity: normalizeSeverity((item as FileIndicatorRule).severity, "high")
        };
      }

      return null;
    })
    .filter((item): item is FileIndicatorRule => item !== null);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeContentIndicators(
  value: unknown,
  fallback: ContentIndicatorRule[]
): ContentIndicatorRule[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => {
      if (typeof item === "string") {
        return { value: item, severity: "medium" as SeverityLevel };
      }

      if (
        typeof item === "object" &&
        item !== null &&
        "value" in item &&
        typeof (item as ContentIndicatorRule).value === "string"
      ) {
        return {
          value: (item as ContentIndicatorRule).value,
          severity: normalizeSeverity((item as ContentIndicatorRule).severity, "medium")
        };
      }

      return null;
    })
    .filter((item): item is ContentIndicatorRule => item !== null);

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeSecretPatterns(
  value: unknown,
  fallback: SecretPatternRule[]
): SecretPatternRule[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "pattern" in item &&
        typeof (item as SecretPatternRule).name === "string" &&
        typeof (item as SecretPatternRule).pattern === "string"
      ) {
        return {
          name: (item as SecretPatternRule).name,
          pattern: (item as SecretPatternRule).pattern,
          severity: normalizeSeverity((item as SecretPatternRule).severity, "critical")
        };
      }

      return null;
    })
    .filter((item): item is SecretPatternRule => item !== null);

  return normalized.length > 0 ? normalized : fallback;
}

async function loadYamlConfigFile(
  context: Context,
  repoInfo: RepositoryContextInfo,
  path: string
): Promise<ComplianceConfigFile | undefined> {
  try {
    const response = await context.octokit.repos.getContent({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path
    });

    if (!("content" in response.data)) {
      return undefined;
    }

    const decodedContent = Buffer.from(response.data.content, "base64").toString("utf-8");
    const parsed = yaml.load(decodedContent) as ComplianceConfigFile;
    const validation = validateComplianceConfig(parsed);
    if (!validation.isValid) {
      context.log.error(`Invalid config in ${path}`);
      for (const error of validation.errors) {
        context.log.error(error);
      }
      return undefined;
    }
    return parsed;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status !== 404) {
      context.log.error(error);
    }
    return undefined;
  }
}

export async function loadComplianceConfig(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<ComplianceRuleSet> {
  const orgConfig = await loadYamlConfigFile(
    context,
    repoInfo,
    ".github/compliance-shield-org.yml"
  );

  const repoConfig = await loadYamlConfigFile(
    context,
    repoInfo,
    ".compliance-shield.yml"
  );

  const selectedPolicy = normalizePolicy(repoConfig?.policy ?? orgConfig?.policy);
  const baseRules = selectedPolicy ? getPolicyPack(selectedPolicy) : defaultRules;

  return {
    bannedFileIndicators: normalizeFileIndicators(
      repoConfig?.bannedFileIndicators ?? orgConfig?.bannedFileIndicators,
      baseRules.bannedFileIndicators
    ),
    bannedContentIndicators: normalizeContentIndicators(
      repoConfig?.bannedContentIndicators ?? orgConfig?.bannedContentIndicators,
      baseRules.bannedContentIndicators
    ),
    secretPatterns: normalizeSecretPatterns(
      repoConfig?.secretPatterns ?? orgConfig?.secretPatterns,
      baseRules.secretPatterns
    ),
    minimumSeverityToFail: normalizeSeverity(
      repoConfig?.minimumSeverityToFail ?? orgConfig?.minimumSeverityToFail,
      baseRules.minimumSeverityToFail
    ),
    ignorePaths: normalizeStringArray(
      repoConfig?.ignorePaths ?? orgConfig?.ignorePaths,
      baseRules.ignorePaths
    ),
    ignoreIndicators: normalizeStringArray(
      repoConfig?.ignoreIndicators ?? orgConfig?.ignoreIndicators,
      baseRules.ignoreIndicators
    ),
    inlineIgnoreComment:
      typeof (repoConfig?.inlineIgnoreComment ?? orgConfig?.inlineIgnoreComment) === "string" &&
      (repoConfig?.inlineIgnoreComment ?? orgConfig?.inlineIgnoreComment)?.trim()
        ? (repoConfig?.inlineIgnoreComment ?? orgConfig?.inlineIgnoreComment)!
        : baseRules.inlineIgnoreComment,
    scanMode: normalizeScanMode(
      repoConfig?.scanMode ?? orgConfig?.scanMode,
      baseRules.scanMode
    ),
    maxRepositoryFiles: normalizeNumber(
      repoConfig?.maxRepositoryFiles ?? orgConfig?.maxRepositoryFiles,
      baseRules.maxRepositoryFiles
    ),
    maxFileSizeKB: normalizeNumber(
      repoConfig?.maxFileSizeKB ?? orgConfig?.maxFileSizeKB,
      baseRules.maxFileSizeKB
    ),
    parallelFileFetchLimit: normalizeNumber(
      repoConfig?.parallelFileFetchLimit ?? orgConfig?.parallelFileFetchLimit,
      baseRules.parallelFileFetchLimit
    ),
    commandPermissions: normalizeCommandPermissions(
      repoConfig?.commandPermissions ?? orgConfig?.commandPermissions,
      baseRules.commandPermissions
    )
  };
}