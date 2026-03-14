import { Context } from "probot";
import { ComplianceRuleSet } from "../types/rules";
import { RepositoryScanResult, RepositoryFileToScan } from "../types/repositoryScan";
import { isLikelyTextFile } from "../utils/contentClassifier";
import { runRepositoryComplianceChecks } from "../rules/ruleEngine";

type PullRequestEventName = "pull_request.opened" | "pull_request.synchronize";

interface GitHubTreeItem {
  path: string;
  type: string;
}

async function getRepositoryTree(
  context: Context<PullRequestEventName>,
  owner: string,
  repo: string,
  treeSha: string
): Promise<GitHubTreeItem[]> {
  const response = await context.octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "true"
  });

  return response.data.tree
    .filter((item): item is GitHubTreeItem => Boolean(item.path && item.type))
    .map((item) => ({
      path: item.path,
      type: item.type
    }));
}

async function getDefaultBranchSha(
  context: Context<PullRequestEventName>,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const response = await context.octokit.repos.getBranch({
    owner,
    repo,
    branch
  });

  return response.data.commit.sha;
}

async function getFileContent(
  context: Context<PullRequestEventName>,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | undefined> {
  try {
    const response = await context.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    if (!("content" in response.data)) {
      return undefined;
    }

    return Buffer.from(response.data.content, "base64").toString("utf-8");
  } catch (error) {
    context.log.warn(`Skipping unreadable file: ${path}`);
    context.log.warn(error);
    return undefined;
  }
}

export async function scanRepository(
  context: Context<PullRequestEventName>,
  rules: ComplianceRuleSet
): Promise<RepositoryScanResult> {
  const repo = context.payload.repository;
  const owner = repo.owner.login;
  const repoName = repo.name;
  const defaultBranch = repo.default_branch;

  const branchSha = await getDefaultBranchSha(context, owner, repoName, defaultBranch);
  const treeItems = await getRepositoryTree(context, owner, repoName, branchSha);

  const filesToScan: RepositoryFileToScan[] = [];
  let skippedFiles = 0;

  for (const item of treeItems) {
    if (item.type !== "blob") {
      continue;
    }

    if (!isLikelyTextFile(item.path)) {
      skippedFiles += 1;
      continue;
    }

    if (rules.ignorePaths.some((ignorePath) => item.path.startsWith(ignorePath))) {
      skippedFiles += 1;
      continue;
    }

    const content = await getFileContent(context, owner, repoName, item.path, defaultBranch);

    if (content === undefined) {
      skippedFiles += 1;
      continue;
    }

    filesToScan.push({
      path: item.path,
      content
    });
  }

  const violations = runRepositoryComplianceChecks(
    filesToScan.map((file) => ({
      filename: file.path,
      content: file.content
    })),
    rules
  );

  return {
    scannedFiles: filesToScan.length,
    skippedFiles,
    violations
  };
}