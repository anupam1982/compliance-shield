import { Context } from "probot";

export async function handlePullRequest(context: Context) {

  const pr = context.payload.pull_request;
  const repo = context.payload.repository;

  const owner = repo.owner.login;
  const repoName = repo.name;

  const message = `
🛡️ Compliance Shield Activated

Pull Request detected.

PR #${pr.number}
Title: ${pr.title}
Author: @${pr.user.login}

Phase 1 complete.
Compliance checks will start in the next phase.
`;

  await context.octokit.issues.createComment({
    owner,
    repo: repoName,
    issue_number: pr.number,
    body: message
  });
}