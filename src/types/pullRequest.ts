export interface PullRequestFileSummary {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  fullContent?: string;
}

export interface PullRequestInspectionResult {
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
  files: PullRequestFileSummary[];
}