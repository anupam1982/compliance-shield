import { ComplianceViolation } from "./rules";

export interface RepositoryFileToScan {
  path: string;
  content: string;
}

export interface RepositoryScanResult {
  scannedFiles: number;
  skippedFiles: number;
  skippedByExtension: number;
  skippedByPath: number;
  skippedBySize: number;
  skippedUnreadable: number;
  limitedByMaxFiles: boolean;
  violations: ComplianceViolation[];
}