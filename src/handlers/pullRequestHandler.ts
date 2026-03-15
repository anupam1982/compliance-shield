import { Context } from "probot";
import { hasBlockingViolations } from "../rules/ruleEngine";
import { reportCheckRun } from "./checkRunReporter";
import { loadComplianceConfig } from "../github/configLoader";
import { upsertPullRequestComment } from "./commentReporter";
import { formatViolationsForComment } from "../utils/violationFormatter";
import { RepositoryContextInfo } from "../types/githubContext";
import { runPullRequestScan, runRepositoryScan } from "./scanService";
import { inspectPullRequestFiles } from "./prFileInspector";
import { createComplianceStorage } from "../storage/storageFactory";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function handlePullRequest(
  context: Context<PullRequestEventName>
): Promise<void> {
  const pr = context.payload.pull_request;
  const repo = context.payload.repository;

  const repoInfo: RepositoryContextInfo = {
    owner: repo.owner.login,
    repo: repo.name,
    defaultBranch: repo.default_branch
  };

  const storage = createComplianceStorage(context, repoInfo);
  const config = await loadComplianceConfig(context, repoInfo);
  const shouldRunRepositoryScan = pr.title.includes("[scan-repo]");

  const inspectionResult = await inspectPullRequestFiles(context, config.scanMode);
  const prScanResult = await runPullRequestScan(context, config);
  const violations = prScanResult.violations;
  const isBlocking = hasBlockingViolations(violations, config.minimumSeverityToFail);

  const fileList = inspectionResult.files
    .slice(0, 20)
    .map(
      (file) =>
        `- \`${file.filename}\` (${file.status}, +${file.additions}/-${file.deletions})`
    )
    .join("\n");

  let repositoryScanSummary = "";

  if (shouldRunRepositoryScan) {
    try {
      const repositoryScanResult = await runRepositoryScan(context, repoInfo, config);

      repositoryScanSummary = `
### Repository scan
- **Triggered:** Yes
- **Scanned files:** ${repositoryScanResult.scannedFiles}
- **Skipped files:** ${repositoryScanResult.skippedFiles}
- **Skipped by extension:** ${repositoryScanResult.skippedByExtension}
- **Skipped by path:** ${repositoryScanResult.skippedByPath}
- **Skipped by size:** ${repositoryScanResult.skippedBySize}
- **Skipped unreadable:** ${repositoryScanResult.skippedUnreadable}
- **Limited by max files:** ${repositoryScanResult.limitedByMaxFiles ? "Yes" : "No"}
- **Repository violations found:** ${repositoryScanResult.violations.length}
`;

      await storage.saveScanState({
        lastUpdatedAt: new Date().toISOString(),
        lastScanType: "repo",
        lastPrNumber: pr.number,
        lastScanMode: config.scanMode,
        lastViolationsFound: repositoryScanResult.violations.length,
        lastScannedFiles: repositoryScanResult.scannedFiles,
        lastSkippedFiles: repositoryScanResult.skippedFiles,
        lastTriggeredBy: pr.user.login
      });

      await storage.appendScanHistory({
        timestamp: new Date().toISOString(),
        scanType: "repo",
        prNumber: pr.number,
        scanMode: config.scanMode,
        violationsFound: repositoryScanResult.violations.length,
        scannedFiles: repositoryScanResult.scannedFiles,
        skippedFiles: repositoryScanResult.skippedFiles,
        triggeredBy: pr.user.login
      });
    } catch (error) {
      context.log.error("Failed to scan repository");
      context.log.error(error);

      repositoryScanSummary = `
### Repository scan
- **Triggered:** Yes
- **Status:** Failed
`;
    }
  } else {
    repositoryScanSummary = `
### Repository scan
- **Triggered:** No
- Add \`[scan-repo]\` to the PR title to run a repository scan.
`;

    try {
      await storage.saveScanState({
        lastUpdatedAt: new Date().toISOString(),
        lastScanType: "pr",
        lastPrNumber: pr.number,
        lastScanMode: config.scanMode,
        lastViolationsFound: prScanResult.violations.length,
        lastScannedFiles: prScanResult.scannedFiles,
        lastSkippedFiles: prScanResult.skippedFiles,
        lastTriggeredBy: pr.user.login
      });

      await storage.appendScanHistory({
        timestamp: new Date().toISOString(),
        scanType: "pr",
        prNumber: pr.number,
        scanMode: config.scanMode,
        violationsFound: prScanResult.violations.length,
        scannedFiles: prScanResult.scannedFiles,
        skippedFiles: prScanResult.skippedFiles,
        triggeredBy: pr.user.login
      });
    } catch (error) {
      context.log.error("Failed to save PR scan state");
      context.log.error(error);
    }
  }

  const body = `
🛡️ **Compliance Shield – Phase 26**

I inspected this pull request using a shared scan engine, storage abstraction, policy packs, severity-aware rules, inline annotations, suppression controls, configurable scan mode, deduplicated reporting, optional repository scanning, persisted scan state, and scan history tracking.

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

${repositoryScanSummary}

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
    await upsertPullRequestComment(context, repoInfo.owner, repoInfo.repo, pr.number, body);
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