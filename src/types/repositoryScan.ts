import { ComplianceViolation } from "./rules";

export interface RepositoryFileToScan {
  path: string;
  content: string;
}

export interface RepositoryScanResult {
  scannedFiles: number;
  skippedFiles: number;
  violations: ComplianceViolation[];
}