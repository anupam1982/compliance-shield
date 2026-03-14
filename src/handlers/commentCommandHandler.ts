import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { scanRepository } from "./repositoryScanner";
import {
  deduplicateViolations,
  formatViolationsForComment
} from "../utils/violationFormatter";
import { RepositoryContextInfo } from "../types/githubContext";

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

  const repoInfo: RepositoryContextInfo = {
    owner: repo.owner.login,
    repo: repo.name,
    defaultBranch: repo.default_branch
  };

  if (parsedCommand.command === "help") {
    await context.octokit.issues.createComment({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      issue_number: issue.number,
      body: `
🛡️ **Compliance Shield Commands**

Available commands:

- \`/compliance-shield help\`
- \`/compliance-shield scan-repo\`
`
    });

    return;
  }

  if (parsedCommand.command === "unknown") {
    await context.octokit.issues.createComment({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
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
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      issue_number: issue.number,
      body: "🛡️ Compliance Shield is scanning the repository. Please wait..."
    });

    try {
      const config = await loadComplianceConfig(context, repoInfo);
      const repositoryScanResult = await scanRepository(context, repoInfo, config);
      const violations = deduplicateViolations(repositoryScanResult.violations);

      await context.octokit.issues.createComment({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        issue_number: issue.number,
        body: `
🛡️ **Compliance Shield Repository Scan Result**

- **Scanned files:** ${repositoryScanResult.scannedFiles}
- **Skipped files:** ${repositoryScanResult.skippedFiles}
- **Skipped by extension:** ${repositoryScanResult.skippedByExtension}
- **Skipped by path:** ${repositoryScanResult.skippedByPath}
- **Skipped by size:** ${repositoryScanResult.skippedBySize}
- **Skipped unreadable:** ${repositoryScanResult.skippedUnreadable}
- **Limited by max files:** ${repositoryScanResult.limitedByMaxFiles ? "Yes" : "No"}
- **Violations found:** ${violations.length}
- **Minimum severity to fail:** ${config.minimumSeverityToFail.toUpperCase()}
- **Scan mode:** ${config.scanMode}
- **Parallel fetch limit:** ${config.parallelFileFetchLimit}
- **Max repository files:** ${config.maxRepositoryFiles}
- **Max file size (KB):** ${config.maxFileSizeKB}

### Findings
${formatViolationsForComment(violations)}
`
      });
    } catch (error) {
      context.log.error("Repository scan command failed");
      context.log.error(error);

      await context.octokit.issues.createComment({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        issue_number: issue.number,
        body: "🛡️ Repository scan failed. Please check the app logs."
      });
    }
  }
}