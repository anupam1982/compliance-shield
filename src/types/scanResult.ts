import { ComplianceViolation } from "./rules";

export interface PullRequestScanResult {
  scanType: "pr";
  scannedFiles: number;
  skippedFiles: number;
  violations: ComplianceViolation[];
}

export interface RepositoryFullScanResult {
  scanType: "repo";
  scannedFiles: number;
  skippedFiles: number;
  skippedByExtension: number;
  skippedByPath: number;
  skippedBySize: number;
  skippedUnreadable: number;
  limitedByMaxFiles: boolean;
  violations: ComplianceViolation[];
}

export type ComplianceScanResult =
  | PullRequestScanResult
  | RepositoryFullScanResult;