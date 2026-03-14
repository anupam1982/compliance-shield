import { Context } from "probot";
import yaml from "js-yaml";
import { defaultRules } from "../rules/defaultRules";
import {
  ComplianceRuleSet,
  ContentIndicatorRule,
  FileIndicatorRule,
  SecretPatternRule,
  SeverityLevel
} from "../types/rules";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

const validSeverityLevels: SeverityLevel[] = ["low", "medium", "high", "critical"];

function normalizeSeverity(value: unknown, fallback: SeverityLevel): SeverityLevel {
  return typeof value === "string" && validSeverityLevels.includes(value as SeverityLevel)
    ? (value as SeverityLevel)
    : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter((item): item is string => typeof item === "string");
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeFileIndicators(value: unknown): FileIndicatorRule[] {
  if (!Array.isArray(value)) {
    return defaultRules.bannedFileIndicators;
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

  return normalized.length > 0 ? normalized : defaultRules.bannedFileIndicators;
}

function normalizeContentIndicators(value: unknown): ContentIndicatorRule[] {
  if (!Array.isArray(value)) {
    return defaultRules.bannedContentIndicators;
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

  return normalized.length > 0 ? normalized : defaultRules.bannedContentIndicators;
}

function normalizeSecretPatterns(value: unknown): SecretPatternRule[] {
  if (!Array.isArray(value)) {
    return defaultRules.secretPatterns;
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

  return normalized.length > 0 ? normalized : defaultRules.secretPatterns;
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
    const parsed = yaml.load(decodedContent) as Partial<ComplianceRuleSet> | undefined;

    return {
      bannedFileIndicators: normalizeFileIndicators(parsed?.bannedFileIndicators),
      bannedContentIndicators: normalizeContentIndicators(parsed?.bannedContentIndicators),
      secretPatterns: normalizeSecretPatterns(parsed?.secretPatterns),
      minimumSeverityToFail: normalizeSeverity(parsed?.minimumSeverityToFail, "high"),
      ignorePaths: normalizeStringArray(parsed?.ignorePaths, []),
      ignoreIndicators: normalizeStringArray(parsed?.ignoreIndicators, []),
      inlineIgnoreComment:
        typeof parsed?.inlineIgnoreComment === "string" && parsed.inlineIgnoreComment.trim()
          ? parsed.inlineIgnoreComment
          : defaultRules.inlineIgnoreComment
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