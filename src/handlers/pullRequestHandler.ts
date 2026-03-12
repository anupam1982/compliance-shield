import { Context } from "probot";
import { inspectPullRequestFiles } from "./prFileInspector";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function handlePullRequest(
  context: Context<PullRequestEventName>
): Promise<void> {
  const pr = context.payload.pull_request;
  const repo = context.payload.repository;

  const owner = repo.owner.login;
  const repoName = repo.name;

  const inspectionResult = await inspectPullRequestFiles(context);

  const fileList = inspectionResult.files
    .slice(0, 20)
    .map(
      (file) =>
        `- \`${file.filename}\` (${file.status}, +${file.additions}/-${file.deletions})`
    )
    .join("\n");

  const body = `
🛡️ **Compliance Shield – Phase 2**

I inspected this pull request.

- **PR:** #${pr.number}
- **Title:** ${pr.title}
- **Author:** @${pr.user.login}
- **Files changed:** ${inspectionResult.totalFiles}
- **Lines added:** ${inspectionResult.totalAdditions}
- **Lines removed:** ${inspectionResult.totalDeletions}

### Changed files
${fileList || "- No files found"}

Phase 2 complete. Next, I’ll start checking these files against compliance rules.
`;

  await context.octokit.issues.createComment({
    owner,
    repo: repoName,
    issue_number: pr.number,
    body
  });
}