import { Context } from "probot";
import yaml from "js-yaml";
import { defaultRules } from "../rules/defaultRules";
import { getPolicyPack } from "../rules/policyPacks";
import {
  ComplianceConfigFile,
  ComplianceRuleSet,
  ContentIndicatorRule,
  FileIndicatorRule,
  PolicyName,
  ScanMode,
  SecretPatternRule,
  SeverityLevel
} from "../types/rules";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

const validSeverityLevels: SeverityLevel[] = ["low", "medium", "high", "critical"];
const validScanModes: ScanMode[] = ["diff", "full-file"];
const validPolicyNames: PolicyName[] = ["baseline", "strict", "secrets-only", "crypto"];

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

export async function loadComplianceConfig(
  context: Context<PullRequestEventName>
): Promise<ComplianceRuleSet> {
  const repo = context.payload.repository;
  const owner = repo.owner.login;
  const repoName = repo.name;

  try {
    const response = await context.octokit.repos.getContent({
      owner,
      repo: repoName,
      path: ".compliance-shield.yml"
    });

    if (!("content" in response.data)) {
      return defaultRules;
    }

    const decodedContent = Buffer.from(response.data.content, "base64").toString("utf-8");
    const parsed = yaml.load(decodedContent) as ComplianceConfigFile | undefined;

    const selectedPolicy = normalizePolicy(parsed?.policy);
    const baseRules = selectedPolicy ? getPolicyPack(selectedPolicy) : defaultRules;

    return {
      bannedFileIndicators: normalizeFileIndicators(
        parsed?.bannedFileIndicators,
        baseRules.bannedFileIndicators
      ),
      bannedContentIndicators: normalizeContentIndicators(
        parsed?.bannedContentIndicators,
        baseRules.bannedContentIndicators
      ),
      secretPatterns: normalizeSecretPatterns(
        parsed?.secretPatterns,
        baseRules.secretPatterns
      ),
      minimumSeverityToFail: normalizeSeverity(
        parsed?.minimumSeverityToFail,
        baseRules.minimumSeverityToFail
      ),
      ignorePaths: normalizeStringArray(parsed?.ignorePaths, baseRules.ignorePaths),
      ignoreIndicators: normalizeStringArray(
        parsed?.ignoreIndicators,
        baseRules.ignoreIndicators
      ),
      inlineIgnoreComment:
        typeof parsed?.inlineIgnoreComment === "string" && parsed.inlineIgnoreComment.trim()
          ? parsed.inlineIgnoreComment
          : baseRules.inlineIgnoreComment,
      scanMode: normalizeScanMode(parsed?.scanMode, baseRules.scanMode)
    };
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      return defaultRules;
    }
    context.log.error(error);
    return defaultRules;
  }
}