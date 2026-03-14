export interface ScanHistoryEntry {
  timestamp: string;
  scanType: "pr" | "repo" | "scheduled";
  prNumber?: number;
  scanMode: string;
  violationsFound: number;
  scannedFiles: number;
  skippedFiles?: number;
  triggeredBy?: string;
}

export interface ScanHistory {
  entries: ScanHistoryEntry[];
}