// import { Context } from "probot";
// import { parseComplianceShieldCommand } from "../utils/commandParser";
// import { loadComplianceConfig } from "../github/configLoader";
// import { RepositoryContextInfo } from "../types/githubContext";
// import { upsertBotComment } from "../utils/commentUpsert";
// import { handlePullRequest } from "./pullRequestHandler";
// import { hasCommandPermission } from "../utils/permissionChecker";
// import { runRepositoryScan } from "./scanService";
// import { createComplianceStorage } from "../storage/storageFactory";
// import { formatViolationWithSuggestion } from "../utils/autofixSuggestions";
// import { recordScanMetric } from "../services/metricsService";
// import {
//   calculateRepositoryRiskScore,
//   calculateSeverityCounts
// } from "../services/severityAnalyticsService";
// import { persistViolations } from "../services/violationPersistenceService";
// import { generateAIReview } from "../services/aiReviewerService";
// import { generateGovernanceResponse } from "../services/governanceCopilotService";
// import { generateAutofixSuggestions } from "../services/aiAutofixService";
// import { recordOverrideAudit } from "../services/overrideAuditService";
// import { scanQueue } from "../queues/scanQueue";
// import { recordUsageEvent } from "../services/usageMeteringService";
// import { aiCommandQueue } from "../queues/aiCommandQueue";
// import { AiCommandType } from "../types/queue";

// type IssueCommentEventName = "issue_comment.created";

// function isPullRequestComment(context: Context<IssueCommentEventName>): boolean {
//   return Boolean(context.payload.issue.pull_request);
// }

// async function denyPermission(
//   context: Context<IssueCommentEventName>,
//   repoInfo: RepositoryContextInfo,
//   issueNumber: number,
//   command: string
// ): Promise<void> {
//   await upsertBotComment(
//     context,
//     repoInfo.owner,
//     repoInfo.repo,
//     issueNumber,
//     `🛡️ You do not have permission to run \`${command}\` in this repository.`
//   );
// }

// async function queueAiCommand(
//   context: Context<IssueCommentEventName>,
//   repoInfo: RepositoryContextInfo,
//   prNumber: number,
//   actor: string,
//   accountLogin: string,
//   command: AiCommandType
// ): Promise<void> {
//   const installationId = context.payload.installation?.id;

//   if (!installationId) {
//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       prNumber,
//       "🤖 Unable to queue AI command because installation context is missing."
//     );
//     return;
//   }

//   const job = await aiCommandQueue.add(
//     "ai-command",
//     {
//       owner: repoInfo.owner,
//       repo: repoInfo.repo,
//       prNumber,
//       triggeredBy: actor,
//       installationId,
//       accountLogin,
//       command
//     },
//     {
//       attempts: 3,
//       backoff: {
//         type: "exponential",
//         delay: 5000
//       },
//       removeOnComplete: {
//         age: 60 * 60 * 24,
//         count: 100
//       },
//       removeOnFail: {
//         age: 60 * 60 * 24 * 7
//       }
//     }
//   );

//   await upsertBotComment(
//     context,
//     repoInfo.owner,
//     repoInfo.repo,
//     prNumber,
//     `🤖 Compliance Shield queued AI command \`${command}\` for background processing.

// **Job ID:** ${job.id}`
//   );
// }

// export async function handleCommentCommand(
//   context: Context<IssueCommentEventName>
// ): Promise<void> {
//   if (!isPullRequestComment(context)) {
//     return;
//   }

//   const commentBody = context.payload.comment.body.trim();
//   const repo = context.payload.repository;
//   const issue = context.payload.issue;
//   const actor = context.payload.comment.user.login;

//   const repoInfo: RepositoryContextInfo = {
//     owner: repo.owner.login,
//     repo: repo.name,
//     defaultBranch: repo.default_branch
//   };
//   const installationId = context.payload.installation?.id;
//   const accountLogin = context.payload.sender?.login ?? repoInfo.owner;

//   const storage = createComplianceStorage(context, repoInfo);
//   const config = await loadComplianceConfig(context, repoInfo);
//   const normalizedComment = commentBody.toLowerCase();

//   if (normalizedComment === "/compliance-shield autofix") {
//     await recordUsageEvent({
//       installationId,
//       accountLogin,
//       owner: repoInfo.owner,
//       repo: repoInfo.repo,
//       eventType: "autofix_requested",
//       metadata: {
//         prNumber: issue.number,
//         triggeredBy: actor
//       }
//     });
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions["scan-repo"]
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield autofix"
//       );
//       return;
//     }

//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       issue.number,
//       "🤖 Compliance Shield is generating AI autofix suggestions..."
//     );

//     try {
//       const result = await runRepositoryScan(context, repoInfo, config);
//       const suggestions = await generateAutofixSuggestions(result.violations);

//       const formattedSuggestions = suggestions
//         .map(
//           (s) => `
// ### ${s.fileName}

// **Severity:** ${s.severity}

// **Problem:** ${s.problem}

// ${s.suggestion}
// `
//         )
//         .join("\n---\n");

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// # 🤖 AI AutoFix Suggestions

// ${formattedSuggestions}
// `
//       );
//     } catch (error) {
//       context.log.error("AI autofix failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🤖 AI autofix generation failed."
//       );
//     }

//     return;
//   }

//   if (normalizedComment === "/compliance-shield explain") {
//     await recordUsageEvent({
//       installationId,
//       accountLogin,
//       owner: repoInfo.owner,
//       repo: repoInfo.repo,
//       eventType: "ai_review_requested",
//       metadata: {
//         prNumber: issue.number,
//         triggeredBy: actor
//       }
//     });
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions["scan-repo"]
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield explain"
//       );
//       return;
//     }

//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       issue.number,
//       "🤖 Compliance Shield is generating an AI security review..."
//     );

//     try {
//       const result = await runRepositoryScan(context, repoInfo, config);
//       const review = await generateAIReview(result.violations);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// ## 🤖 AI Security Review

// **Repository:** ${repoInfo.owner}/${repoInfo.repo}  
// **Risk Level:** ${review.riskLevel}  
// **Findings analyzed:** ${result.violations.length}

// ${review.summary}
// `
//       );
//     } catch (error) {
//       context.log.error("AI explain command failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🤖 AI security review failed. Please check the app logs."
//       );
//     }

//     return;
//   }

//   const copilotCommands = [
//     "/compliance-shield why-blocked",
//     "/compliance-shield explain-risk",
//     "/compliance-shield top-risk"
//   ];

//   if (copilotCommands.includes(normalizedComment)) {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions["scan-repo"]
//     );

//     if (!allowed) {
//       await denyPermission(context, repoInfo, issue.number, normalizedComment);
//       return;
//     }

//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       issue.number,
//       "🤖 Governance Copilot is analyzing this repository..."
//     );

//     try {
//       const result = await runRepositoryScan(context, repoInfo, config);

//       let question = "";

//       switch (normalizedComment) {
//         case "/compliance-shield why-blocked":
//           question = "Why should this pull request be blocked?";
//           break;
//         case "/compliance-shield explain-risk":
//           question = "Explain the repository risk posture.";
//           break;
//         case "/compliance-shield top-risk":
//           question = "What are the highest risk issues?";
//           break;
//       }

//       const response = await generateGovernanceResponse(
//         question,
//         result.violations
//       );

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// ## 🤖 Governance Copilot

// ${response}
// `
//       );
//     } catch (error) {
//       context.log.error("Governance Copilot failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🤖 Governance Copilot failed."
//       );
//     }

//     return;
//   }

//   if (normalizedComment.startsWith("/compliance-shield override")) {
//     const reasonMatch = commentBody.match(/reason:(.*?)(?:\s+expires:\d+d|$)/i);
//     const reason = reasonMatch?.[1]?.trim() ?? "No reason provided";
//     const approvers = config.governance?.overrideApprovers ?? [];
//     const expiresMatch = commentBody.match(/expires:(\d+)d/i);
//     let expiresAt: Date | undefined;

//     await recordUsageEvent({
//       installationId,
//       accountLogin,
//       owner: repoInfo.owner,
//       repo: repoInfo.repo,
//       eventType: "override_created",
//       metadata: {
//         prNumber: issue.number,
//         triggeredBy: actor,
//         reason,
//         expiresAt: expiresAt?.toISOString()
//       }
//     });
//     const allowed = await hasCommandPermission(context, repoInfo, "admin");

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield override"
//       );
//       return;
//     }
//     if (approvers.length > 0 && !approvers.includes(actor)) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield override"
//       );
//       return;
//     }

    

//     if (expiresMatch) {
//       const days = Number(expiresMatch[1]);

//       expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
//     }

//     try {
//       const result = await runRepositoryScan(context, repoInfo, config);
//       const severityCounts = calculateSeverityCounts(result.violations);
//       const riskScore = calculateRepositoryRiskScore(severityCounts);

//       await recordOverrideAudit({
//         owner: repoInfo.owner,
//         repo: repoInfo.repo,
//         prNumber: issue.number,
//         approvedBy: actor,
//         reason,
//         riskScore,
//         expiresAt
//       });

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// ## 🛡️ Compliance Override Approved

// **Approved by:** ${actor}

// **Reason:** ${reason}

// **Risk Score:** ${riskScore}/100

// **Expires:** ${expiresAt ? expiresAt.toISOString() : "Never"}

// This override has been recorded in the governance audit trail.
// `
//       );
//     } catch (error) {
//       context.log.error("Override workflow failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Failed to record override."
//       );
//     }

//     return;
//   }

//   const parsedCommand = parseComplianceShieldCommand(commentBody);

//   if (!parsedCommand) {
//     return;
//   }

//   if (parsedCommand.command === "help") {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions.help
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield help"
//       );
//       return;
//     }

//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       issue.number,
//       `
// 🛡️ **Compliance Shield Commands**

// Available commands:

// - \`/compliance-shield help\`
// - \`/compliance-shield status\`
// - \`/compliance-shield history\`
// - \`/compliance-shield scan-repo\`
// - \`/compliance-shield rescan\`
// - \`/compliance-shield explain\`
// - \`/compliance-shield why-blocked\`
// - \`/compliance-shield explain-risk\`
// - \`/compliance-shield top-risk\`
// - \`/compliance-shield autofix\`
// - \`/compliance-shield override reason:<reason> expires:30d\`

// ### Command permissions
// - **help:** ${config.commandPermissions.help}
// - **status:** ${config.commandPermissions.status}
// - **scan-repo:** ${config.commandPermissions["scan-repo"]}
// - **rescan:** ${config.commandPermissions.rescan}
// `
//     );

//     return;
//   }

//   if (parsedCommand.command === "status") {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions.status
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield status"
//       );
//       return;
//     }

//     try {
//       const lastState = await storage.loadScanState();
//       const history = await storage.loadScanHistory();

//       const recentHistory = history.entries
//         .slice(0, 5)
//         .map(
//           (entry, index) =>
//             `${index + 1}. **${entry.scanType.toUpperCase()}** • ${entry.timestamp} • Violations: ${entry.violationsFound} • Files: ${entry.scannedFiles}`
//         )
//         .join("\n");

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// 🛡️ **Compliance Shield Status**

// **Repository:** ${repoInfo.owner}/${repoInfo.repo}

// ### Last scan state
// - Last updated: ${lastState?.lastUpdatedAt ?? "None"}
// - Last scan type: ${lastState?.lastScanType ?? "None"}
// - Violations: ${lastState?.lastViolationsFound ?? 0}
// - Files scanned: ${lastState?.lastScannedFiles ?? 0}

// ### Recent scans
// ${recentHistory || "No scan history yet"}
// `
//       );
//     } catch (error) {
//       context.log.error("Status command failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Failed to load Compliance Shield status."
//       );
//     }

//     return;
//   }

//   if (parsedCommand.command === "history") {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions.status
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield history"
//       );
//       return;
//     }

//     try {
//       const history = await storage.loadScanHistory();

//       const historyText = history.entries
//         .slice(0, 20)
//         .map(
//           (entry, index) =>
//             `${index + 1}. **${entry.scanType.toUpperCase()}** • ${entry.timestamp} • Violations: ${entry.violationsFound} • Files: ${entry.scannedFiles}`
//         )
//         .join("\n");

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// 🛡️ **Compliance Shield Scan History**

// ${historyText || "No scan history yet"}
// `
//       );
//     } catch (error) {
//       context.log.error("History command failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Failed to load Compliance Shield history."
//       );
//     }

//     return;
//   }

//   if (parsedCommand.command === "scan-repo") {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions["scan-repo"]
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield scan-repo"
//       );
//       return;
//     }

//     try {
//       await recordUsageEvent({
//         installationId,
//         accountLogin,
//         owner: repoInfo.owner,
//         repo: repoInfo.repo,
//         eventType: "scan_queued",
//         metadata: {
//           prNumber: issue.number,
//           triggeredBy: actor
//         }
//       });
//       const job = await scanQueue.add(
//         "repository-scan",
//         {
//           owner: repoInfo.owner,
//           repo: repoInfo.repo,
//           prNumber: issue.number,
//           triggeredBy: actor,
//           installationId: context.payload.installation?.id,
//           accountLogin:(context.payload.installation as any)?.account?.login ??repoInfo.owner
//         },
//         {
//           attempts: 3,
//           backoff: {
//             type: "exponential",
//             delay: 5000
//           },
//           removeOnComplete: {
//             age: 60 * 60 * 24,
//             count: 100
//           },
//           removeOnFail: {
//             age: 60 * 60 * 24 * 7
//           }
//         }
//       );

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         `
// 🛡️ **Repository Scan Queued**

// Compliance Shield has queued this repository scan for background processing.

// **Job ID:** ${job.id}
// `
//       );
//     } catch (error) {
//       context.log.error("Failed to queue repository scan");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Failed to queue repository scan. Please check the app logs."
//       );
//     }

//     return;
//   }

//   if (parsedCommand.command === "rescan") {
//     const allowed = await hasCommandPermission(
//       context,
//       repoInfo,
//       config.commandPermissions.rescan
//     );

//     if (!allowed) {
//       await denyPermission(
//         context,
//         repoInfo,
//         issue.number,
//         "/compliance-shield rescan"
//       );
//       return;
//     }

//     await upsertBotComment(
//       context,
//       repoInfo.owner,
//       repoInfo.repo,
//       issue.number,
//       "🛡️ Compliance Shield is rescanning this pull request..."
//     );

//     try {
//       const prResponse = await context.octokit.pulls.get({
//         owner: repoInfo.owner,
//         repo: repoInfo.repo,
//         pull_number: issue.number
//       });

//       const syntheticContext = {
//         ...context,
//         payload: {
//           ...context.payload,
//           action: "synchronize",
//           number: issue.number,
//           pull_request: prResponse.data,
//           repository: context.payload.repository
//         }
//       } as unknown as Context<"pull_request.opened">;

//       await handlePullRequest(syntheticContext);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Pull request rescan completed."
//       );
//     } catch (error) {
//       context.log.error("Rescan command failed");
//       context.log.error(error);

//       await upsertBotComment(
//         context,
//         repoInfo.owner,
//         repoInfo.repo,
//         issue.number,
//         "🛡️ Pull request rescan failed. Please check the app logs."
//       );
//     }

//     return;
//   }

//   await upsertBotComment(
//     context,
//     repoInfo.owner,
//     repoInfo.repo,
//     issue.number,
//     `
// 🛡️ Unknown Compliance Shield command.

// Try:

// - \`/compliance-shield help\`
// `
//   );
// }

import { Context } from "probot";
import { parseComplianceShieldCommand } from "../utils/commandParser";
import { loadComplianceConfig } from "../github/configLoader";
import { RepositoryContextInfo } from "../types/githubContext";
import { upsertBotComment } from "../utils/commentUpsert";
import { handlePullRequest } from "./pullRequestHandler";
import { hasCommandPermission } from "../utils/permissionChecker";
import { runRepositoryScan } from "./scanService";
import { createComplianceStorage } from "../storage/storageFactory";
import {
  calculateRepositoryRiskScore,
  calculateSeverityCounts
} from "../services/severityAnalyticsService";
import { recordOverrideAudit } from "../services/overrideAuditService";
import { scanQueue } from "../queues/scanQueue";
import { recordUsageEvent } from "../services/usageMeteringService";
import { aiCommandQueue } from "../queues/aiCommandQueue";
import { AiCommandType } from "../types/queue";

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

async function safeRecordUsageEvent(
  context: Context<IssueCommentEventName>,
  input: Parameters<typeof recordUsageEvent>[0]
): Promise<void> {
  try {
    await recordUsageEvent(input);
  } catch (error) {
    context.log.warn("Usage metering failed");
    context.log.warn(error);
  }
}

async function queueAiCommand(
  context: Context<IssueCommentEventName>,
  repoInfo: RepositoryContextInfo,
  prNumber: number,
  actor: string,
  accountLogin: string,
  command: AiCommandType
): Promise<void> {
  const installationId = context.payload.installation?.id;

  if (!installationId) {
    await upsertBotComment(
      context,
      repoInfo.owner,
      repoInfo.repo,
      prNumber,
      "🤖 Unable to queue AI command because installation context is missing."
    );
    return;
  }

  const job = await aiCommandQueue.add(
    "ai-command",
    {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      prNumber,
      triggeredBy: actor,
      installationId,
      accountLogin,
      command
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: {
        age: 60 * 60 * 24,
        count: 100
      },
      removeOnFail: {
        age: 60 * 60 * 24 * 7
      }
    }
  );

  await upsertBotComment(
    context,
    repoInfo.owner,
    repoInfo.repo,
    prNumber,
    `🤖 Compliance Shield queued AI command \`${command}\` for background processing.

**Job ID:** ${job.id}`
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

  const installationId = context.payload.installation?.id;
  const accountLogin = context.payload.sender?.login ?? repoInfo.owner;

  const storage = createComplianceStorage(context, repoInfo);
  const config = await loadComplianceConfig(context, repoInfo);
  const normalizedComment = commentBody.toLowerCase();

  context.log.info(
    {
      command: normalizedComment,
      repo: `${repoInfo.owner}/${repoInfo.repo}`,
      issue: issue.number,
      actor
    },
    "Compliance Shield command received"
  );

  if (normalizedComment === "/compliance-shield autofix") {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield autofix");
      return;
    }

    await safeRecordUsageEvent(context, {
      installationId,
      accountLogin,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      eventType: "autofix_requested",
      metadata: {
        prNumber: issue.number,
        triggeredBy: actor
      }
    });

    await queueAiCommand(
      context,
      repoInfo,
      issue.number,
      actor,
      accountLogin,
      "autofix"
    );

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

    await safeRecordUsageEvent(context, {
      installationId,
      accountLogin,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      eventType: "ai_review_requested",
      metadata: {
        prNumber: issue.number,
        triggeredBy: actor
      }
    });

    await queueAiCommand(
      context,
      repoInfo,
      issue.number,
      actor,
      accountLogin,
      "explain"
    );

    return;
  }

  const aiCommandMap: Record<string, AiCommandType> = {
    "/compliance-shield why-blocked": "why-blocked",
    "/compliance-shield explain-risk": "explain-risk",
    "/compliance-shield top-risk": "top-risk"
  };

  if (normalizedComment in aiCommandMap) {
    const allowed = await hasCommandPermission(
      context,
      repoInfo,
      config.commandPermissions["scan-repo"]
    );

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, normalizedComment);
      return;
    }

    await safeRecordUsageEvent(context, {
      installationId,
      accountLogin,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      eventType: "governance_copilot_requested",
      metadata: {
        prNumber: issue.number,
        triggeredBy: actor,
        command: normalizedComment
      }
    });

    await queueAiCommand(
      context,
      repoInfo,
      issue.number,
      actor,
      accountLogin,
      aiCommandMap[normalizedComment]
    );

    return;
  }

  if (normalizedComment.startsWith("/compliance-shield override")) {
    const allowed = await hasCommandPermission(context, repoInfo, "admin");

    if (!allowed) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield override");
      return;
    }

    const approvers = config.governance?.overrideApprovers ?? [];

    if (approvers.length > 0 && !approvers.includes(actor)) {
      await denyPermission(context, repoInfo, issue.number, "/compliance-shield override");
      return;
    }

    const reasonMatch = commentBody.match(/reason:(.*?)(?:\s+expires:\d+d|$)/i);
    const reason = reasonMatch?.[1]?.trim() ?? "No reason provided";

    const expiresMatch = commentBody.match(/expires:(\d+)d/i);
    let expiresAt: Date | undefined;

    if (expiresMatch) {
      const days = Number(expiresMatch[1]);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    await safeRecordUsageEvent(context, {
      installationId,
      accountLogin,
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      eventType: "override_created",
      metadata: {
        prNumber: issue.number,
        triggeredBy: actor,
        reason,
        expiresAt: expiresAt?.toISOString()
      }
    });

    try {
      const result = await runRepositoryScan(context, repoInfo, config);
      const severityCounts = calculateSeverityCounts(result.violations);
      const riskScore = calculateRepositoryRiskScore(severityCounts);

      await recordOverrideAudit({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        prNumber: issue.number,
        approvedBy: actor,
        reason,
        riskScore,
        expiresAt
      });

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
## 🛡️ Compliance Override Approved

**Approved by:** ${actor}

**Reason:** ${reason}

**Risk Score:** ${riskScore}/100

**Expires:** ${expiresAt ? expiresAt.toISOString() : "Never"}

This override has been recorded in the governance audit trail.
`
      );
    } catch (error) {
      context.log.error("Override workflow failed");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Failed to record override."
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
- \`/compliance-shield autofix\`
- \`/compliance-shield override reason:<reason> expires:30d\`

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

    try {
      await safeRecordUsageEvent(context, {
        installationId,
        accountLogin,
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        eventType: "scan_queued",
        metadata: {
          prNumber: issue.number,
          triggeredBy: actor
        }
      });

      const job = await scanQueue.add(
        "repository-scan",
        {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          prNumber: issue.number,
          triggeredBy: actor,
          installationId,
          accountLogin
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000
          },
          removeOnComplete: {
            age: 60 * 60 * 24,
            count: 100
          },
          removeOnFail: {
            age: 60 * 60 * 24 * 7
          }
        }
      );

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        `
🛡️ **Repository Scan Queued**

Compliance Shield has queued this repository scan for background processing.

**Job ID:** ${job.id}
`
      );
    } catch (error) {
      context.log.error("Failed to queue repository scan");
      context.log.error(error);

      await upsertBotComment(
        context,
        repoInfo.owner,
        repoInfo.repo,
        issue.number,
        "🛡️ Failed to queue repository scan. Please check the app logs."
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