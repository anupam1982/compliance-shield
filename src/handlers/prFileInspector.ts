import { Context } from "probot";
import {
  PullRequestFileSummary,
  PullRequestInspectionResult
} from "../types/pullRequest";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

export async function inspectPullRequestFiles(
  context: Context<PullRequestEventName>
): Promise<PullRequestInspectionResult> {
  const repo = context.payload.repository;
  const pr = context.payload.pull_request;

  const owner = repo.owner.login;
  const repoName = repo.name;
  const pullNumber = pr.number;

  const filesResponse = await context.octokit.pulls.listFiles({
    owner,
    repo: repoName,
    pull_number: pullNumber,
    per_page: 100
  });

  const files: PullRequestFileSummary[] = filesResponse.data.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch ?? ""
  }));

  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return {
    totalFiles: files.length,
    totalAdditions,
    totalDeletions,
    files
  };
}