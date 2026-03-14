export interface ScanState {
  lastUpdatedAt: string;
  lastScanType: "pr" | "repo" | "scheduled";
  lastPrNumber?: number;
  lastScanMode: string;
  lastViolationsFound: number;
  lastScannedFiles: number;
  lastSkippedFiles?: number;
  lastTriggeredBy?: string;
}
