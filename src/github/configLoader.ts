import { Context } from "probot";
import yaml from "js-yaml";
import { defaultRules } from "../rules/defaultRules";
import { ComplianceRuleSet } from "../types/rules";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function loadComplianceConfig(
  context: Context<PullRequestEventName>
): Promise<ComplianceRuleSet> {
  const repo = context.payload.repository;
  const owner = repo.owner.login;
  const repoName = repo.name;

  try {
    context.log.info("Loading .compliance-shield.yml from repository");

    const response = await context.octokit.repos.getContent({
      owner,
      repo: repoName,
      path: ".compliance-shield.yml"
    });

    if (!("content" in response.data)) {
      context.log.warn("Config file found but no content available, using default rules");
      return defaultRules;
    }

    const decodedContent = Buffer.from(response.data.content, "base64").toString("utf-8");
    const parsed = yaml.load(decodedContent) as Partial<ComplianceRuleSet> | undefined;

    const config: ComplianceRuleSet = {
      bannedFileIndicators:
        parsed?.bannedFileIndicators && Array.isArray(parsed.bannedFileIndicators)
          ? parsed.bannedFileIndicators.map(String)
          : defaultRules.bannedFileIndicators,
      bannedContentIndicators:
        parsed?.bannedContentIndicators && Array.isArray(parsed.bannedContentIndicators)
          ? parsed.bannedContentIndicators.map(String)
          : defaultRules.bannedContentIndicators
    };

    context.log.info("Loaded compliance rules from .compliance-shield.yml");
    return config;
  } catch (error: unknown) {
    const err = error as { status?: number };

    if (err.status === 404) {
      context.log.info("No .compliance-shield.yml found, using default rules");
      return defaultRules;
    }

    context.log.error("Failed to load config file, using default rules");
    context.log.error(error);
    return defaultRules;
  }
}