import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { RepositoryContextInfo } from "../types/githubContext";
import { upsertBotComment } from "../utils/commentUpsert";
import { hasCommandPermission } from "../utils/permissionChecker";
import {
  appendScanHistory,
  loadScanHistory,
  loadScanState,
  saveScanState
} from "./scanStateStore";
import { runRepositoryScan } from "./scanService";
import { formatViolationsForComment } from "../utils/violationFormatter";
import { handlePullRequest } from "./pullRequestHandler";

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

  /*
  ======================
  HELP COMMAND
  ======================
  */

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
- \`/compliance-shield history\`
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

  /*
  ======================
  STATUS COMMAND
  ======================
  */

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

    const state = await loadScanState(context, repoInfo);
    const history = await loadScanHistory(context, repoInfo);

    const recentHistory = history.entries
      .slice(0, 5)
      .map(
        (entry, index) =>
          `${index + 1}. **${entry.scanType.toUpperCase()}** • ${entry.timestamp} • Violations: ${entry.violationsFound} • Files: ${entry.scannedFiles}`
      )
      .join("\n");

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      `
🛡️ **Compliance Shield Status**

**Repository:** ${repoInfo.owner}/${repoInfo.repo}

### Last scan state
- Last updated: ${state?.lastUpdatedAt ?? "None"}
- Last scan type: ${state?.lastScanType ?? "None"}
- Violations: ${state?.lastViolationsFound ?? 0}
- Files scanned: ${state?.lastScannedFiles ?? 0}

### Recent scans
${recentHistory || "No scan history yet"}
`
    );

    return;
  }

  /*
  ======================
  HISTORY COMMAND
  ======================
  */

  if (parsedCommand.command === "history") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions.status
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield history");
      return;
    }

    const history = await loadScanHistory(context, repoInfo);

    const historyText = history.entries
      .slice(0, 20)
      .map(
        (entry, index) =>
          `${index + 1}. **${entry.scanType.toUpperCase()}** • ${entry.timestamp} • Violations: ${entry.violationsFound} • Files: ${entry.scannedFiles}`
      )
      .join("\n");

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      `
🛡️ **Compliance Shield Scan History**

${historyText || "No scan history yet"}
`
    );

    return;
  }

  /*
  ======================
  SCAN REPO COMMAND
  ======================
  */

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
      "🛡️ Compliance Shield is scanning the repository..."
    );

    const result = await runRepositoryScan(context, repoInfo, config);

    await saveScanState(context, repoInfo, {
      lastUpdatedAt: new Date().toISOString(),
      lastScanType: "repo",
      lastScanMode: config.scanMode,
      lastViolationsFound: result.violations.length,
      lastScannedFiles: result.scannedFiles,
      lastSkippedFiles: result.skippedFiles,
      lastTriggeredBy: actor
    });

    await appendScanHistory(context, repoInfo, {
      timestamp: new Date().toISOString(),
      scanType: "repo",
      scanMode: config.scanMode,
      violationsFound: result.violations.length,
      scannedFiles: result.scannedFiles,
      skippedFiles: result.skippedFiles,
      triggeredBy: actor
    });

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      `
🛡️ **Repository Scan Result**

Files scanned: ${result.scannedFiles}  
Skipped files: ${result.skippedFiles}  
Violations found: ${result.violations.length}

${formatViolationsForComment(result.violations)}
`
    );

    return;
  }

  /*
  ======================
  RESCAN COMMAND
  ======================
  */

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
      "🛡️ Compliance Shield is rescanning this pull request..."
    );

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
    } as unknown as Context<"pull_request.opened">;

    await handlePullRequest(syntheticContext);

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🛡️ Pull request rescan completed."
    );

    return;
  }

  /*
  ======================
  UNKNOWN COMMAND
  ======================
  */

  await upsertBotComment(
    context,
    repoInfo.owner,
    repoInfo.repo,
    issue.number,
    `
🛡️ Unknown Compliance Shield command.

Try:

- \`/compliance-shield help\`
`
  );
}