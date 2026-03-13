import { Context } from "probot";
import { ComplianceViolation, SeverityLevel } from "../types/rules";
import { hasBlockingViolations } from "../rules/ruleEngine";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

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

  await context.octokit.checks.create({
    owner,
    repo: repoName,
    name: "Compliance Shield",
    head_sha: headSha,
    status: "completed",
    conclusion,
    output: {
      title,
      summary
    }
  });
}