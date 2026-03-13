import { Context } from "probot";
import { inspectPullRequestFiles } from "./prFileInspector";
import { runComplianceChecks } from "../rules/ruleEngine";
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

  context.log.info(`Handling PR #${pr.number} in ${owner}/${repoName}`);

  const config = await loadComplianceConfig(context);
  context.log.info(
    `Loaded config: ${config.bannedFileIndicators.length} file rule(s), ${config.bannedContentIndicators.length} content rule(s)`
  );

  const inspectionResult = await inspectPullRequestFiles(context);
  context.log.info(`Inspected ${inspectionResult.totalFiles} file(s)`);

  const violations = runComplianceChecks(inspectionResult.files, config);
  context.log.info(`Found ${violations.length} violation(s)`);

  const fileList = inspectionResult.files
    .slice(0, 20)
    .map(
      (file) =>
        `- \`${file.filename}\` (${file.status}, +${file.additions}/-${file.deletions})`
    )
    .join("\n");

  const violationSection =
    violations.length === 0
      ? "✅ No compliance violations detected in this phase."
      : violations
          .map(
            (violation, index) =>
              `${index + 1}. **${violation.type.toUpperCase()}** in \`${violation.fileName}\` — ${violation.message}`
          )
          .join("\n");

  const body = `
🛡️ **Compliance Shield – Phase 5**

I inspected this pull request using repository-configured compliance rules.

- **PR:** #${pr.number}
- **Title:** ${pr.title}
- **Author:** @${pr.user.login}
- **Files changed:** ${inspectionResult.totalFiles}
- **Lines added:** ${inspectionResult.totalAdditions}
- **Lines removed:** ${inspectionResult.totalDeletions}
- **Violations found:** ${violations.length}

### Active rules
- **Banned file indicators:** ${config.bannedFileIndicators.join(", ") || "None"}
- **Banned content indicators:** ${config.bannedContentIndicators.join(", ") || "None"}

### Changed files
${fileList || "- No files found"}

### Compliance report
${violationSection}
`;

  try {
    context.log.info("Creating PR comment");
    await context.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: pr.number,
      body
    });
    context.log.info("PR comment created successfully");
  } catch (error) {
    context.log.error("Failed to create PR comment");
    context.log.error(error);
  }

  try {
    context.log.info("Creating check run");
    await reportCheckRun(context, violations);
    context.log.info("Check run created successfully");
  } catch (error) {
    context.log.error("Failed to create check run");
    context.log.error(error);
  }
}