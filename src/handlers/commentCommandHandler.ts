import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { RepositoryContextInfo } from "../types/githubContext";
import { upsertBotComment } from "../utils/commentUpsert";
import { handlePullRequest } from "./pullRequestHandler";
import { hasCommandPermission } from "../utils/permissionChecker";
import { runRepositoryScan } from "./scanService";
import { createComplianceStorage } from "../storage/storageFactory";
import { formatViolationWithSuggestion } from "../utils/autofixSuggestions";
import { recordScanMetric } from "../services/metricsService";
import {
  calculateRepositoryRiskScore,
  calculateSeverityCounts
} from "../services/severityAnalyticsService";
import { persistViolations } from "../services/violationPersistenceService";
import { generateAIReview } from "../services/aiReviewerService";
import { generateGovernanceResponse } from "../services/governanceCopilotService";
import { generateAutofixSuggestions } from "../services/aiAutofixService";

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

  const commentBody = context.payload.comment.body.trim();
  const repo = context.payload.repository;
  const issue = context.payload.issue;
  const actor = context.payload.comment.user.login;

  const repoInfo: RepositoryContextInfo = {
    owner: repo.owner.login,
    repo: repo.name,
    defaultBranch: repo.default_branch
  };

  const storage = createComplianceStorage(context, repoInfo);
  const config = await loadComplianceConfig(context, repoInfo);

  const normalizedComment = commentBody.toLowerCase();

  if (normalizedComment === "/compliance-shield autofix") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );
  
    if (!allowed) {
      await denyPermission(
        context,
        repoInfo,
        issue.number,
        "/compliance-shield autofix"
      );
  
      return;
    }
  
    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🤖 Compliance Shield is generating AI autofix suggestions..."
    );
  
    try {
      const result = await runRepositoryScan(
        context,
        repoInfo,
        config
      );
  
      const suggestions =
        await generateAutofixSuggestions(
          result.violations
        );
  
      const formattedSuggestions =
        suggestions
          .map(
            (s) => `
  ### ${s.fileName}
  
  **Severity:** ${s.severity}
  
  **Problem:** ${s.problem}
  
  ${s.suggestion}
  `
          )
          .join("\n---\n");
  
      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
  # 🤖 AI AutoFix Suggestions
  
  ${formattedSuggestions}
  `
      );
    } catch (error) {
      context.log.error("AI autofix failed");
      context.log.error(error);
  
      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🤖 AI autofix generation failed."
      );
    }
  
    return;
  }

  if (normalizedComment === "/compliance-shield explain") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield explain");
      return;
    }

    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🤖 Compliance Shield is generating an AI security review..."
    );

    try {
      const result = await runRepositoryScan(context, repoInfo, config);
      const review = await generateAIReview(result.violations);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
## 🤖 AI Security Review

**Repository:** ${repoInfo.owner}/${repoInfo.repo}  
**Risk Level:** ${review.riskLevel}  
**Findings analyzed:** ${result.violations.length}

${review.summary}
`
      );
    } catch (error) {
      context.log.error("AI explain command failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🤖 AI security review failed. Please check the app logs."
      );
    }

    return;
  }

  const copilotCommands = [
    "/compliance-shield why-blocked",
    "/compliance-shield explain-risk",
    "/compliance-shield top-risk"
  ];
  
  if (copilotCommands.includes(normalizedComment)) {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );
  
    if (!allowed) {
      await denyPermission(
        context,
        repoInfo,
        issue.number,
        normalizedComment
      );
  
      return;
    }
  
    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      issue.number,
      "🤖 Governance Copilot is analyzing this repository..."
    );
  
    try {
      const result = await runRepositoryScan(
        context,
        repoInfo,
        config
      );
  
      let question = "";
  
      switch (normalizedComment) {
        case "/compliance-shield why-blocked":
          question =
            "Why should this pull request be blocked?";
          break;
  
        case "/compliance-shield explain-risk":
          question =
            "Explain the repository risk posture.";
          break;
  
        case "/compliance-shield top-risk":
          question =
            "What are the highest risk issues?";
          break;
      }
  
      const response =
        await generateGovernanceResponse(
          question,
          result.violations
        );
  
      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
  ## 🤖 Governance Copilot
  
  ${response}
  `
      );
    } catch (error) {
      context.log.error("Governance Copilot failed");
      context.log.error(error);
  
      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🤖 Governance Copilot failed."
      );
    }
  
    return;
  }

  const parsedCommand = parseComplianceShieldCommand(commentBody);

  if (!parsedCommand) {
    return;
  }

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
- \`/compliance-shield explain\`
- \`/compliance-shield why-blocked\`
- \`/compliance-shield explain-risk\`
- \`/compliance-shield top-risk\`

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
      const lastState = await storage.loadScanState();
      const history = await storage.loadScanHistory();

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
- Last updated: ${lastState?.lastUpdatedAt ?? "None"}
- Last scan type: ${lastState?.lastScanType ?? "None"}
- Violations: ${lastState?.lastViolationsFound ?? 0}
- Files scanned: ${lastState?.lastScannedFiles ?? 0}

### Recent scans
${recentHistory || "No scan history yet"}
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

    try {
      const history = await storage.loadScanHistory();

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
    } catch (error) {
      context.log.error("History command failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Failed to load Compliance Shield history."
      );
    }

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
      "🛡️ Compliance Shield is scanning the repository..."
    );

    try {
      const scanStartedAt = Date.now();
      const result = await runRepositoryScan(context, repoInfo, config);
      const severityCounts = calculateSeverityCounts(result.violations);
      const riskScore = calculateRepositoryRiskScore(severityCounts);

      const scanMetricId = await recordScanMetric({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        scanType: "repo",
        prNumber: issue.number,
        scanMode: config.scanMode,
        violationsFound: result.violations.length,
        scannedFiles: result.scannedFiles,
        skippedFiles: result.skippedFiles,
        durationMs: Date.now() - scanStartedAt,
        triggeredBy: actor,
        criticalCount: severityCounts.critical,
        highCount: severityCounts.high,
        mediumCount: severityCounts.medium,
        lowCount: severityCounts.low,
        riskScore
      });

      if (scanMetricId) {
        await persistViolations(scanMetricId, result.violations);
      }

      const formattedViolations =
        result.violations.length === 0
          ? "✅ No compliance violations detected."
          : result.violations
              .map((violation) => formatViolationWithSuggestion(violation))
              .join("\n");

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
Risk score: ${riskScore}/100

${formattedViolations}
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
      "🛡️ Compliance Shield is rescanning this pull request..."
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
      } as unknown as Context<"pull_request.opened">;

      await handlePullRequest(syntheticContext);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Pull request rescan completed."
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

    return;
  }

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