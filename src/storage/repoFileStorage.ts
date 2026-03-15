import { Context } from "probot";
import { BaseComplianceStorage } from "./storage";
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

export class RepoFileStorage extends BaseComplianceStorage {
  constructor(
    private readonly context: Context,
    private readonly repoInfo: RepositoryContextInfo
  ) {
    super();
  }

  private async getExistingFile(path: string): Promise<RepoContentFile | null> {
    try {
      const response = await this.context.octokit.repos.getContent({
        owner: this.repoInfo.owner,
        repo: this.repoInfo.repo,
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

  private async saveJsonFile(
    path: string,
    message: string,
    value: unknown
  ): Promise<void> {
    const existing = await this.getExistingFile(path);
    const content = Buffer.from(JSON.stringify(value, null, 2), "utf-8").toString("base64");

    await this.context.octokit.repos.createOrUpdateFileContents({
      owner: this.repoInfo.owner,
      repo: this.repoInfo.repo,
      path,
      message,
      content,
      branch: this.repoInfo.defaultBranch,
      sha: existing?.sha
    });
  }

  async loadScanState(): Promise<ScanState | null> {
    const existing = await this.getExistingFile(STATE_FILE_PATH);

    if (!existing) {
      return null;
    }

    try {
      return JSON.parse(existing.content) as ScanState;
    } catch (error) {
      this.context.log.error("Failed to parse scan state file");
      this.context.log.error(error);
      return null;
    }
  }

  async saveScanState(state: ScanState): Promise<void> {
    await this.saveJsonFile(
      STATE_FILE_PATH,
      "Update Compliance Shield scan state",
      state
    );
  }

  async loadScanHistory(): Promise<ScanHistory> {
    const existing = await this.getExistingFile(HISTORY_FILE_PATH);

    if (!existing) {
      return { entries: [] };
    }

    try {
      return JSON.parse(existing.content) as ScanHistory;
    } catch (error) {
      this.context.log.error("Failed to parse scan history file");
      this.context.log.error(error);
      return { entries: [] };
    }
  }

  async appendScanHistory(entry: ScanHistoryEntry): Promise<void> {
    const history = await this.loadScanHistory();

    const updatedHistory: ScanHistory = {
      entries: [entry, ...history.entries].slice(0, MAX_HISTORY_ENTRIES)
    };

    await this.saveJsonFile(
      HISTORY_FILE_PATH,
      "Update Compliance Shield scan history",
      updatedHistory
    );
  }
}