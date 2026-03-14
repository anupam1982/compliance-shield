import { Context } from "probot";
import { RepositoryContextInfo } from "../types/githubContext";
import { ComplianceRuleSet } from "../types/rules";
import {
  PullRequestScanResult,
  RepositoryFullScanResult
} from "../types/scanResult";
import { inspectPullRequestFiles } from "./prFileInspector";
import { scanRepository } from "./repositoryScanner";
import { runComplianceChecks } from "../rules/ruleEngine";
import { deduplicateViolations } from "../utils/violationFormatter";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function runPullRequestScan(
  context: Context<PullRequestEventName>,
  config: ComplianceRuleSet
): Promise<PullRequestScanResult> {
  const inspectionResult = await inspectPullRequestFiles(context, config.scanMode);

  const rawViolations = runComplianceChecks(inspectionResult.files, config);
  const violations = deduplicateViolations(rawViolations);

  return {
    scanType: "pr",
    scannedFiles: inspectionResult.totalFiles,
    skippedFiles: 0,
    violations
  };
}

export async function runRepositoryScan(
  context: Context,
  repoInfo: RepositoryContextInfo,
  config: ComplianceRuleSet
): Promise<RepositoryFullScanResult> {
  const repositoryScanResult = await scanRepository(context, repoInfo, config);
  const violations = deduplicateViolations(repositoryScanResult.violations);

  return {
    scanType: "repo",
    scannedFiles: repositoryScanResult.scannedFiles,
    skippedFiles: repositoryScanResult.skippedFiles,
    skippedByExtension: repositoryScanResult.skippedByExtension,
    skippedByPath: repositoryScanResult.skippedByPath,
    skippedBySize: repositoryScanResult.skippedBySize,
    skippedUnreadable: repositoryScanResult.skippedUnreadable,
    limitedByMaxFiles: repositoryScanResult.limitedByMaxFiles,
    violations
  };
}