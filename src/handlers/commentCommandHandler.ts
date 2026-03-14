import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { scanRepository } from "./repositoryScanner";
import {
  deduplicateViolations,
  formatViolationsForComment
} from "../utils/violationFormatter";
import { RepositoryContextInfo } from "../types/githubContext";
import { upsertBotComment } from "../utils/commentUpsert";
import { handlePullRequest } from "./pullRequestHandler";
import { hasCommandPermission } from "../utils/permissionChecker";
import { loadScanState, saveScanState } from "./scanStateStore";

type IssueCommentEventName = "issue_comment.created";

function isPullRequestComment(context: Context<IssueCommentEventName>): boolean {
  return Boolean(context.payload.issue.pull_request);
}

async function denyPermission(
  context: Context<IssueCommentEventName>,
  repoInfo: RepositoryContextInfo,
  issueNumber: number,
  command: string
): Promise<void> {
  await upsertBotComment(
    context,
    repoInfo.owner,
    repoInfo.repo,
    issueNumber,
    `🛡️ You do not have permission to run \`${command}\` in this repository.`
  );
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
  const actor = context.payload.comment.user.login;

  const repoInfo: RepositoryContextInfo = {
    owner: repo.owner.login,
    repo: repo.name,
    defaultBranch: repo.default_branch
  };

  const config = await loadComplianceConfig(context, repoInfo);

  if (parsedCommand.command === "help") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions.help
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield help");
      return;
    }

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      `
🛡️ **Compliance Shield Commands**

Available commands:

- \`/compliance-shield help\`
- \`/compliance-shield status\`
- \`/compliance-shield scan-repo\`
- \`/compliance-shield rescan\`

### Command permissions
- **help:** ${config.commandPermissions.help}
- **status:** ${config.commandPermissions.status}
- **scan-repo:** ${config.commandPermissions["scan-repo"]}
- **rescan:** ${config.commandPermissions.rescan}
`
    );
    return;
  }

  if (parsedCommand.command === "status") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions.status
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield status");
      return;
    }

    try {
      const lastState = await loadScanState(context, repoInfo);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
🛡️ **Compliance Shield Status**

- **Repository:** ${repoInfo.owner}/${repoInfo.repo}
- **Default branch:** ${repoInfo.defaultBranch}
- **Scan mode:** ${config.scanMode}
- **Minimum severity to fail:** ${config.minimumSeverityToFail.toUpperCase()}
- **Max repository files:** ${config.maxRepositoryFiles}
- **Max file size (KB):** ${config.maxFileSizeKB}
- **Parallel fetch limit:** ${config.parallelFileFetchLimit}
- **Ignored paths:** ${config.ignorePaths.join(", ") || "None"}
- **Ignored indicators:** ${config.ignoreIndicators.join(", ") || "None"}
- **Inline ignore comment:** ${config.inlineIgnoreComment}

### Command permissions
- **help:** ${config.commandPermissions.help}
- **status:** ${config.commandPermissions.status}
- **scan-repo:** ${config.commandPermissions["scan-repo"]}
- **rescan:** ${config.commandPermissions.rescan}

### Last scan state
- **Last updated:** ${lastState?.lastUpdatedAt ?? "No scan recorded yet"}
- **Last scan type:** ${lastState?.lastScanType ?? "N/A"}
- **Last PR number:** ${lastState?.lastPrNumber ?? "N/A"}
- **Last scan mode:** ${lastState?.lastScanMode ?? "N/A"}
- **Last violations found:** ${lastState?.lastViolationsFound ?? "N/A"}
- **Last scanned files:** ${lastState?.lastScannedFiles ?? "N/A"}
- **Last skipped files:** ${lastState?.lastSkippedFiles ?? "N/A"}
- **Last triggered by:** ${lastState?.lastTriggeredBy ?? "N/A"}

### Active rules
- **Banned file indicators:** ${config.bannedFileIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Banned content indicators:** ${config.bannedContentIndicators.map((rule) => `${rule.value} (${rule.severity})`).join(", ") || "None"}
- **Secret patterns:** ${config.secretPatterns.map((rule) => `${rule.name} (${rule.severity})`).join(", ") || "None"}
`
      );
    } catch (error) {
      context.log.error("Status command failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Failed to load Compliance Shield status."
      );
    }

    return;
  }

  if (parsedCommand.command === "unknown") {
    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      `
🛡️ I did not recognize that command.

Try:

- \`/compliance-shield help\`
- \`/compliance-shield status\`
- \`/compliance-shield scan-repo\`
- \`/compliance-shield rescan\`
`
    );
    return;
  }

  if (parsedCommand.command === "scan-repo") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield scan-repo");
      return;
    }

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🛡️ Compliance Shield is scanning the repository. Please wait..."
    );

    try {
      const repositoryScanResult = await scanRepository(context, repoInfo, config);
      const violations = deduplicateViolations(repositoryScanResult.violations);

      await saveScanState(context, repoInfo, {
        lastUpdatedAt: new Date().toISOString(),
        lastScanType: "repo",
        lastPrNumber: issue.number,
        lastScanMode: config.scanMode,
        lastViolationsFound: violations.length,
        lastScannedFiles: repositoryScanResult.scannedFiles,
        lastSkippedFiles: repositoryScanResult.skippedFiles,
        lastTriggeredBy: actor
      });

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
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
      );
    } catch (error) {
      context.log.error("Repository scan command failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Repository scan failed. Please check the app logs."
      );
    }

    return;
  }

  if (parsedCommand.command === "rescan") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions.rescan
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield rescan");
      return;
    }

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🛡️ Compliance Shield is rescanning this pull request. Please wait..."
    );

    try {
      const prResponse = await context.octokit.pulls.get({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        pull_number: issue.number
      });

      const syntheticContext = {
        ...context,
        payload: {
          ...context.payload,
          action: "synchronize",
          number: issue.number,
          pull_request: prResponse.data,
          repository: context.payload.repository
        }
      } as unknown as Context<"pull_request.opened" | "pull_request.synchronize">;

      await handlePullRequest(syntheticContext);

      await saveScanState(context, repoInfo, {
        lastUpdatedAt: new Date().toISOString(),
        lastScanType: "pr",
        lastPrNumber: issue.number,
        lastScanMode: config.scanMode,
        lastViolationsFound: 0,
        lastScannedFiles: 0,
        lastTriggeredBy: actor
      });

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Compliance Shield completed the rescan for this pull request."
      );
    } catch (error) {
      context.log.error("Rescan command failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Pull request rescan failed. Please check the app logs."
      );
    }
  }
}