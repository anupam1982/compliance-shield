import { Context } from "probot";
import { ComplianceViolation, SeverityLevel } from "../types/rules";
import { hasBlockingViolations } from "../rules/ruleEngine";
import {
  deduplicateViolations,
  formatEnhancedSummary
} from "../utils/violationFormatter";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

function mapSeverityToAnnotationLevel(
  severity: SeverityLevel
): "notice" | "warning" | "failure" {
  switch (severity) {
    case "low":
      return "notice";
    case "medium":
      return "warning";
    case "high":
      return "failure";
    case "critical":
      return "failure";
  }
}

export async function reportCheckRun(
  context: Context<PullRequestEventName>,
  violations: ComplianceViolation[],
  minimumSeverityToFail: SeverityLevel
): Promise<void> {
  const repo = context.payload.repository;
  const pr = context.payload.pull_request;

  const owner = repo.owner.login;
  const repoName = repo.name;
  const headSha = pr.head.sha;

  const dedupedViolations = deduplicateViolations(violations);
  const isBlocking = hasBlockingViolations(dedupedViolations, minimumSeverityToFail);
  const conclusion = isBlocking ? "failure" : "success";

  const title =
    dedupedViolations.length === 0
      ? "No compliance violations found"
      : isBlocking
        ? `Blocking violations found (${minimumSeverityToFail}+ threshold)`
        : `Violations found, but below fail threshold (${minimumSeverityToFail})`;

  const summary = formatEnhancedSummary(dedupedViolations);

  const annotations = dedupedViolations
    .filter((violation) => violation.line && violation.line > 0)
    .slice(0, 50)
    .map((violation) => ({
      path: violation.fileName,
      start_line: violation.line as number,
      end_line: violation.line as number,
      annotation_level: mapSeverityToAnnotationLevel(violation.severity),
      message: `${violation.message}

      Recommended action:
      - Review this code
      - Remove sensitive content
      - Follow repository compliance policy`,
      title: `[${violation.severity.toUpperCase()}] ${violation.type.toUpperCase()}`
    }));

  try {
    const response = await context.octokit.checks.create({
      owner,
      repo: repoName,
      name: "Compliance Shield",
      head_sha: headSha,
      status: "completed",
      conclusion,
      output: {
        title,
        summary,
        annotations
      }
    });
  
    console.log("✅ Check run created successfully");
    console.log(response.data.id);
  } catch (error) {
    console.error("❌ Failed to create check run");
    console.error(error);
  }
}