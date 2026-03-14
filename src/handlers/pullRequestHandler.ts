import { Context } from "probot";
import { inspectPullRequestFiles } from "./prFileInspector";
import { runComplianceChecks, hasBlockingViolations } from "../rules/ruleEngine";
import { reportCheckRun } from "./checkRunReporter";
import { loadComplianceConfig } from "../github/configLoader";
import { upsertPullRequestComment } from "./commentReporter";
import {
  deduplicateViolations,
  formatViolationsForComment
} from "../utils/violationFormatter";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function handlePullRequest(
  context: Context<PullRequestEventName>
): Promise<void> {
  const pr = context.payload.pull_request;
  const repo = context.payload.repository;

  const owner = repo.owner.login;
  const repoName = repo.name;

  const config = await loadComplianceConfig(context);
  const inspectionResult = await inspectPullRequestFiles(context, config.scanMode);

  const rawViolations = runComplianceChecks(inspectionResult.files, config);
  const violations = deduplicateViolations(rawViolations);
  const isBlocking = hasBlockingViolations(violations, config.minimumSeverityToFail);

  const fileList = inspectionResult.files
    .slice(0, 20)
    .map(
      (file) =>
        `- \`${file.filename}\` (${file.status}, +${file.additions}/-${file.deletions})`
    )
    .join("\n");

  const body = `
🛡️ **Compliance Shield – Phase 13**

I inspected this pull request using policy packs, severity-aware rules, inline annotations, suppression controls, comment upsert behavior, configurable scan mode, and deduplicated reporting.

- **PR:** #${pr.number}
- **Title:** ${pr.title}
- **Author:** @${pr.user.login}
- **Files changed:** ${inspectionResult.totalFiles}
- **Lines added:** ${inspectionResult.totalAdditions}
- **Lines removed:** ${inspectionResult.totalDeletions}
- **Violations found:** ${violations.length}
- **Minimum severity to fail:** ${config.minimumSeverityToFail.toUpperCase()}
- **Scan mode:** ${config.scanMode}
- **PR status:** ${isBlocking ? "❌ BLOCKING" : "✅ PASSING"}

### Active configuration
- **Banned file indicators:** ${config.bannedFileIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Banned content indicators:** ${config.bannedContentIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Secret patterns:** ${config.secretPatterns.map((rule) => `${rule.name} (${rule.severity})`).join(", ") || "None"}

### Suppression settings
- **Ignored paths:** ${config.ignorePaths.join(", ") || "None"}
- **Ignored indicators:** ${config.ignoreIndicators.join(", ") || "None"}
- **Inline ignore comment:** ${config.inlineIgnoreComment}

### Changed files
${fileList || "- No files found"}

### Compliance report
${formatViolationsForComment(violations)}
`;
  try {
    await upsertPullRequestComment(context, owner, repoName, pr.number, body);
  } catch (error) {
    context.log.error("Failed to create or update PR comment");
    context.log.error(error);
  }

  try {
    await reportCheckRun(context, violations, config.minimumSeverityToFail);
  } catch (error) {
    context.log.error("Failed to create check run");
    context.log.error(error);
  }
}