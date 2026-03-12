export interface PullRequestFileSummary {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestInspectionResult {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: PullRequestFileSummary[];
}