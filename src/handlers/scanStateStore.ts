import { Context } from "probot";
import { RepositoryContextInfo } from "../types/githubContext";
import { ScanState } from "../types/scanState";
import { ScanHistory, ScanHistoryEntry } from "../types/scanHistory";

const STATE_FILE_PATH = ".github/compliance-shield-state.json";
const HISTORY_FILE_PATH = ".github/compliance-shield-history.json";
const MAX_HISTORY_ENTRIES = 20;

interface RepoContentFile {
  sha: string;
  content: string;
}

async function getExistingFile(
  context: Context,
  repoInfo: RepositoryContextInfo,
  path: string
): Promise<RepoContentFile | null> {
  try {
    const response = await context.octokit.repos.getContent({
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      path
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

async function saveJsonFile(
  context: Context,
  repoInfo: RepositoryContextInfo,
  path: string,
  message: string,
  value: unknown
): Promise<void> {
  const existing = await getExistingFile(context, repoInfo, path);
  const content = Buffer.from(JSON.stringify(value, null, 2), "utf-8").toString("base64");

  await context.octokit.repos.createOrUpdateFileContents({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    path,
    message,
    content,
    branch: repoInfo.defaultBranch,
    sha: existing?.sha
  });
}

export async function loadScanState(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<ScanState | null> {
  const existing = await getExistingFile(context, repoInfo, STATE_FILE_PATH);

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
  await saveJsonFile(
    context,
    repoInfo,
    STATE_FILE_PATH,
    "Update Compliance Shield scan state",
    state
  );
}

export async function loadScanHistory(
  context: Context,
  repoInfo: RepositoryContextInfo
): Promise<ScanHistory> {
  const existing = await getExistingFile(context, repoInfo, HISTORY_FILE_PATH);

  if (!existing) {
    return { entries: [] };
  }

  try {
    return JSON.parse(existing.content) as ScanHistory;
  } catch (error) {
    context.log.error("Failed to parse scan history file");
    context.log.error(error);
    return { entries: [] };
  }
}

export async function appendScanHistory(
  context: Context,
  repoInfo: RepositoryContextInfo,
  entry: ScanHistoryEntry
): Promise<void> {
  const history = await loadScanHistory(context, repoInfo);

  const updatedHistory: ScanHistory = {
    entries: [entry, ...history.entries].slice(0, MAX_HISTORY_ENTRIES)
  };

  await saveJsonFile(
    context,
    repoInfo,
    HISTORY_FILE_PATH,
    "Update Compliance Shield scan history",
    updatedHistory
  );
}