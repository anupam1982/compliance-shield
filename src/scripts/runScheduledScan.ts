import { Probot, ProbotOctokit } from "probot";
import { loadComplianceConfig } from "../github/configLoader";
import { runRepositoryScan } from "../handlers/scanService";
import { saveScanState } from "../handlers/scanStateStore";
import { RepositoryContextInfo } from "../types/githubContext";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const owner = getRequiredEnv("SCHEDULED_SCAN_OWNER");
  const repo = getRequiredEnv("SCHEDULED_SCAN_REPO");
  const defaultBranch = process.env["SCHEDULED_SCAN_DEFAULT_BRANCH"] || "main";

  const appId = getRequiredEnv("APP_ID");
  const privateKey = getRequiredEnv("PRIVATE_KEY");

  const repoInfo: RepositoryContextInfo = {
    owner,
    repo,
    defaultBranch
  };

  const probot = new Probot({
    appId,
    privateKey,
    secret: process.env["WEBHOOK_SECRET"] || "scheduled-scan-secret",
    Octokit: ProbotOctokit
  });

  const octokit = await probot.auth();

  const context = {
    octokit,
    log: console
  } as unknown as Parameters<typeof loadComplianceConfig>[0];

  const config = await loadComplianceConfig(context, repoInfo);
  const result = await runRepositoryScan(context, repoInfo, config);

  await saveScanState(context, repoInfo, {
    lastUpdatedAt: new Date().toISOString(),
    lastScanType: "scheduled",
    lastScanMode: config.scanMode,
    lastViolationsFound: result.violations.length,
    lastScannedFiles: result.scannedFiles,
    lastSkippedFiles: result.skippedFiles,
    lastTriggeredBy: "github-actions"
  });

  console.log("Compliance Shield scheduled scan completed");
  console.log(`Scanned files: ${result.scannedFiles}`);
  console.log(`Skipped files: ${result.skippedFiles}`);
  console.log(`Violations found: ${result.violations.length}`);
}

main().catch((error) => {
  console.error("Scheduled scan failed");
  console.error(error);
  process.exit(1);
});