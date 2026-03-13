import { Context } from "probot";
import { inspectPullRequestFiles } from "./prFileInspector";
import { runComplianceChecks, hasBlockingViolations } from "../rules/ruleEngine";
import { reportCheckRun } from "./checkRunReporter";
import { loadComplianceConfig } from "../github/configLoader";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function handlePullRequest(
  context: Context<PullRequestEventName>
): Promise<void> {
  const pr = context.payload.pull_request;
  const repo = context.payload.repository;

  const owner = repo.owner.login;
  const repoName = repo.name;

  const config = await loadComplianceConfig(context);
  const inspectionResult = await inspectPullRequestFiles(context);
  const violations = runComplianceChecks(inspectionResult.files, config);
  const isBlocking = hasBlockingViolations(violations, config.minimumSeverityToFail);

  const fileList = inspectionResult.files
    .slice(0, 20)
    .map(
      (file) =>
        `- \`${file.filename}\` (${file.status}, +${file.additions}/-${file.deletions})`
    )
    .join("\n");

  const violationSection =
    violations.length === 0
      ? "✅ No compliance violations detected."
      : violations
          .map(
            (violation, index) =>
              `${index + 1}. **${violation.severity.toUpperCase()}** **${violation.type.toUpperCase()}** in \`${violation.fileName}\` — ${violation.message}`
          )
          .join("\n");

  const body = `
🛡️ **Compliance Shield – Phase 7**

I inspected this pull request using severity-aware compliance rules.

- **PR:** #${pr.number}
- **Title:** ${pr.title}
- **Author:** @${pr.user.login}
- **Files changed:** ${inspectionResult.totalFiles}
- **Lines added:** ${inspectionResult.totalAdditions}
- **Lines removed:** ${inspectionResult.totalDeletions}
- **Violations found:** ${violations.length}
- **Minimum severity to fail:** ${config.minimumSeverityToFail.toUpperCase()}
- **PR status:** ${isBlocking ? "❌ BLOCKING" : "✅ PASSING"}

### Active rules
- **Banned file indicators:** ${config.bannedFileIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Banned content indicators:** ${config.bannedContentIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Secret patterns:** ${config.secretPatterns.map((rule) => `${rule.name} (${rule.severity})`).join(", ") || "None"}

### Changed files
${fileList || "- No files found"}

### Compliance report
${violationSection}
`;

  try {
    await context.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: pr.number,
      body
    });
  } catch (error) {
    context.log.error(error);
  }

  try {
    await reportCheckRun(context, violations, config.minimumSeverityToFail);
  } catch (error) {
    context.log.error(error);
  }
}