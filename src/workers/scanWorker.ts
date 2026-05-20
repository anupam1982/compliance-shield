import { Worker } from "bullmq";
import { redisConnection } from "../queues/redis";
import { RepositoryScanJob } from "../types/queue";
import { createWorkerOctokit } from "./githubWorkerClient";
import { loadComplianceConfig } from "../github/configLoader";
import { runRepositoryScan } from "../handlers/scanService";
import {
  calculateRepositoryRiskScore,
  calculateSeverityCounts
} from "../services/severityAnalyticsService";
import { recordScanMetric } from "../services/metricsService";
import { persistViolations } from "../services/violationPersistenceService";
import { formatViolationWithSuggestion } from "../utils/autofixSuggestions";

const worker = new Worker<RepositoryScanJob>(
  "compliance-scans",
  async (job) => {
    console.log("Processing scan job", job.data);

    const {
      owner,
      repo,
      prNumber,
      triggeredBy,
      installationId
    } = job.data;

    if (!installationId) {
      throw new Error("Missing installationId");
    }

    const octokit = await createWorkerOctokit(
      installationId
    );

    const repoResponse =
      await octokit.repos.get({
        owner,
        repo
      });

    const repoInfo = {
      owner,
      repo,
      defaultBranch:
        repoResponse.data.default_branch
    };

    const fakeContext: any = {
      octokit,
      log: console,
      payload: {
        repository: repoResponse.data
      }
    };

    const config =
      await loadComplianceConfig(
        fakeContext,
        repoInfo
      );

    const scanStartedAt = Date.now();

    const result =
      await runRepositoryScan(
        fakeContext,
        repoInfo,
        config
      );

    const severityCounts =
      calculateSeverityCounts(
        result.violations
      );

    const riskScore =
      calculateRepositoryRiskScore(
        severityCounts
      );

    const scanMetricId =
      await recordScanMetric({
        owner,
        repo,
        scanType: "repo",
        prNumber,
        scanMode: config.scanMode,
        violationsFound:
          result.violations.length,
        scannedFiles:
          result.scannedFiles,
        skippedFiles:
          result.skippedFiles,
        durationMs:
          Date.now() - scanStartedAt,
        triggeredBy,
        criticalCount:
          severityCounts.critical,
        highCount:
          severityCounts.high,
        mediumCount:
          severityCounts.medium,
        lowCount:
          severityCounts.low,
        riskScore
      });

    if (scanMetricId) {
      await persistViolations(
        scanMetricId,
        result.violations
      );
    }

    const formattedViolations =
      result.violations.length === 0
        ? "✅ No compliance violations detected."
        : result.violations
            .map((violation) =>
              formatViolationWithSuggestion(
                violation
              )
            )
            .join("\n");

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `
🛡️ **Repository Scan Completed**

Files scanned: ${result.scannedFiles}  
Skipped files: ${result.skippedFiles}  
Violations found: ${result.violations.length}  
Risk score: ${riskScore}/100

${formattedViolations}
`
    });

    console.log(
      `Repository scan completed for ${owner}/${repo}`
    );
  },
  {
    connection: redisConnection
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job failed ${job?.id}`,
    err
  );
});