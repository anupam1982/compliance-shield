import { Context } from "probot";
import { ComplianceRuleSet } from "../types/rules";
import { RepositoryScanResult, RepositoryFileToScan } from "../types/repositoryScan";
import { RepositoryContextInfo } from "../types/githubContext";
import { isLikelyTextFile } from "../utils/contentClassifier";
import { runRepositoryComplianceChecks } from "../rules/ruleEngine";

interface GitHubTreeItem {
  path: string;
  type: string;
  size?: number;
}

async function getRepositoryTree(
  context: Context,
  repoInfo: RepositoryContextInfo,
  treeSha: string
): Promise<GitHubTreeItem[]> {
  const response = await context.octokit.git.getTree({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    tree_sha: treeSha,
    recursive: "true"
  });

  return response.data.tree
    .filter((item): item is GitHubTreeItem => Boolean(item.path && item.type))
    .map((item) => ({
      path: item.path,
      type: item.type,
      size: item.size
    }));
}

async function getDefaultBranchSha(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<string> {
  const response = await context.octokit.repos.getBranch({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    branch: repoInfo.defaultBranch
  });

  return response.data.commit.sha;
}

async function getFileContent(
  context: Context,
  repoInfo: RepositoryContextInfo,
  path: string,
  ref: string
): Promise<string | undefined> {
  try {
    const response = await context.octokit.repos.getContent({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
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

async function runWithConcurrencyLimit<TInput, TOutput>(
  items: TInput[],
  limit: number,
  worker: (item: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  let index = 0;

  async function runWorker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;

      const result = await worker(items[currentIndex]);
      results[currentIndex] = result;
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

export async function scanRepository(
  context: Context,
  repoInfo: RepositoryContextInfo,
  rules: ComplianceRuleSet
): Promise<RepositoryScanResult> {
  const branchSha = await getDefaultBranchSha(context, repoInfo);
  const treeItems = await getRepositoryTree(context, repoInfo, branchSha);

  let skippedByExtension = 0;
  let skippedByPath = 0;
  let skippedBySize = 0;
  let skippedUnreadable = 0;
  let limitedByMaxFiles = false;

  const eligibleItems: GitHubTreeItem[] = [];

  for (const item of treeItems) {
    if (item.type !== "blob") {
      continue;
    }

    if (!isLikelyTextFile(item.path)) {
      skippedByExtension += 1;
      continue;
    }

    if (rules.ignorePaths.some((ignorePath) => item.path.startsWith(ignorePath))) {
      skippedByPath += 1;
      continue;
    }

    const sizeKB = item.size ? item.size / 1024 : 0;
    if (sizeKB > rules.maxFileSizeKB) {
      skippedBySize += 1;
      continue;
    }

    eligibleItems.push(item);
  }

  const limitedItems = eligibleItems.slice(0, rules.maxRepositoryFiles);
  if (eligibleItems.length > rules.maxRepositoryFiles) {
    limitedByMaxFiles = true;
  }

  const fetchedFiles = await runWithConcurrencyLimit(
    limitedItems,
    rules.parallelFileFetchLimit,
    async (item): Promise<RepositoryFileToScan | null> => {
      const content = await getFileContent(
        context,
        repoInfo,
        item.path,
        repoInfo.defaultBranch
      );

      if (content === undefined) {
        return null;
      }

      return {
        path: item.path,
        content
      };
    }
  );

  const filesToScan = fetchedFiles.filter(
    (file): file is RepositoryFileToScan => file !== null
  );

  skippedUnreadable = fetchedFiles.length - filesToScan.length;

  const violations = runRepositoryComplianceChecks(
    filesToScan.map((file) => ({
      filename: file.path,
      content: file.content
    })),
    rules
  );

  return {
    scannedFiles: filesToScan.length,
    skippedFiles: skippedByExtension + skippedByPath + skippedBySize + skippedUnreadable,
    skippedByExtension,
    skippedByPath,
    skippedBySize,
    skippedUnreadable,
    limitedByMaxFiles,
    violations
  };
}