import { Context } from "probot";
import { ComplianceViolation } from "../types/rules";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function reportCheckRun(
  context: Context<PullRequestEventName>,
  violations: ComplianceViolation[]
): Promise<void> {
  const repo = context.payload.repository;
  const pr = context.payload.pull_request;

  const owner = repo.owner.login;
  const repoName = repo.name;
  const headSha = pr.head.sha;

  const conclusion = violations.length === 0 ? "success" : "failure";
  const title =
    violations.length === 0
      ? "No compliance violations found"
      : `${violations.length} compliance violation(s) found`;

  const summary =
    violations.length === 0
      ? "Compliance Shield scanned the changed files and found no violations in this phase."
      : violations
          .slice(0, 20)
          .map(
            (violation, index) =>
              `${index + 1}. [${violation.type.toUpperCase()}] ${violation.fileName} — ${violation.message}`
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