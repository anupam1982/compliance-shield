import { Context } from "probot";
import { RepositoryContextInfo } from "../types/githubContext";
import { ScanState } from "../types/scanState";

const STATE_FILE_PATH = ".github/compliance-shield-state.json";

interface RepoContentFile {
  sha: string;
  content: string;
}

async function getExistingStateFile(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<RepoContentFile | null> {
  try {
    const response = await context.octokit.repos.getContent({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path: STATE_FILE_PATH
    });

    if (!("content" in response.data)) {
      return null;
    }

    return {
      sha: response.data.sha,
      content: Buffer.from(response.data.content, "base64").toString("utf-8")
    };
  } catch {
    return null;
  }
}

export async function loadScanState(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<ScanState | null> {
  const existing = await getExistingStateFile(context, repoInfo);

  if (!existing) {
    return null;
  }

  try {
    return JSON.parse(existing.content) as ScanState;
  } catch (error) {
    context.log.error("Failed to parse scan state file");
    context.log.error(error);
    return null;
  }
}

export async function saveScanState(
  context: Context,
  repoInfo: RepositoryContextInfo,
  state: ScanState
): Promise<void> {
  const existing = await getExistingStateFile(context, repoInfo);

  const content = Buffer.from(JSON.stringify(state, null, 2), "utf-8").toString("base64");

  await context.octokit.repos.createOrUpdateFileContents({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    path: STATE_FILE_PATH,
    message: "Update Compliance Shield scan state",
    content,
    branch: repoInfo.defaultBranch,
    sha: existing?.sha
  });
}