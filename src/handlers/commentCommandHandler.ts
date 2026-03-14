import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { scanRepository } from "./repositoryScanner";
import {
  deduplicateViolations,
  formatViolationsForComment
} from "../utils/violationFormatter";

type IssueCommentEventName = "issue_comment.created";

function isPullRequestComment(context: Context<IssueCommentEventName>): boolean {
  return Boolean(context.payload.issue.pull_request);
}

export async function handleCommentCommand(
  context: Context<IssueCommentEventName>
): Promise<void> {
  if (!isPullRequestComment(context)) {
    return;
  }

  const commentBody = context.payload.comment.body;
  const parsedCommand = parseComplianceShieldCommand(commentBody);

  if (!parsedCommand) {
    return;
  }

  const repo = context.payload.repository;
  const issue = context.payload.issue;
  const owner = repo.owner.login;
  const repoName = repo.name;

  if (parsedCommand.command === "help") {
    await context.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issue.number,
      body: `
🛡️ **Compliance Shield Commands**

Available commands:

- \`/compliance-shield help\`
- \`/compliance-shield scan-repo\`

Examples:

- \`/compliance-shield help\`
- \`/compliance-shield scan-repo\`
`
    });

    return;
  }

  if (parsedCommand.command === "unknown") {
    await context.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issue.number,
      body: `
🛡️ I did not recognize that command.

Try:

- \`/compliance-shield help\`
- \`/compliance-shield scan-repo\`
`
    });

    return;
  }

  if (parsedCommand.command === "scan-repo") {
    await context.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issue.number,
      body: "🛡️ Compliance Shield is scanning the repository. Please wait..."
    });

    try {
      const config = await loadComplianceConfig(context as never);
      const repositoryScanResult = await scanRepository(context as never, config);
      const violations = deduplicateViolations(repositoryScanResult.violations);

      await context.octokit.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issue.number,
        body: `
🛡️ **Compliance Shield Repository Scan Result**

- **Scanned files:** ${repositoryScanResult.scannedFiles}
- **Skipped files:** ${repositoryScanResult.skippedFiles}
- **Violations found:** ${violations.length}
- **Minimum severity to fail:** ${config.minimumSeverityToFail.toUpperCase()}
- **Scan mode:** ${config.scanMode}

### Findings
${formatViolationsForComment(violations)}
`
      });
    } catch (error) {
      context.log.error("Repository scan command failed");
      context.log.error(error);

      await context.octokit.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issue.number,
        body: "🛡️ Repository scan failed. Please check the app logs."
      });
    }
  }
}