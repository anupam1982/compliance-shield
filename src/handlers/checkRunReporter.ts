import { Context } from "probot";
import { ComplianceViolation, SeverityLevel } from "../types/rules";
import { hasBlockingViolations } from "../rules/ruleEngine";

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

  const isBlocking = hasBlockingViolations(violations, minimumSeverityToFail);
  const conclusion = isBlocking ? "failure" : "success";

  const title =
    violations.length === 0
      ? "No compliance violations found"
      : isBlocking
        ? `Blocking violations found (${minimumSeverityToFail}+ threshold)`
        : `Violations found, but below fail threshold (${minimumSeverityToFail})`;

  const summary =
    violations.length === 0
      ? "Compliance Shield scanned the changed files and found no violations."
      : violations
          .slice(0, 20)
          .map(
            (violation, index) =>
              `${index + 1}. [${violation.severity.toUpperCase()}] [${violation.type.toUpperCase()}] ${violation.fileName} — ${violation.message}`
          )
          .join("\n");

  const annotations = violations
    .filter((violation) => violation.line && violation.line > 0)
    .slice(0, 50)
    .map((violation) => ({
      path: violation.fileName,
      start_line: violation.line as number,
      end_line: violation.line as number,
      annotation_level: mapSeverityToAnnotationLevel(violation.severity),
      message: violation.message,
      title: `${violation.severity.toUpperCase()} - ${violation.indicator}`
    }));

  await context.octokit.checks.create({
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
}