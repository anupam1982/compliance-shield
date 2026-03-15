import { ComplianceStorage } from "../types/storage";
import { ScanHistory, ScanHistoryEntry } from "../types/scanHistory";
import { ScanState } from "../types/scanState";

export abstract class BaseComplianceStorage implements ComplianceStorage {
  abstract loadScanState(): Promise<ScanState | null>;
  abstract saveScanState(state: ScanState): Promise<void>;
  abstract loadScanHistory(): Promise<ScanHistory>;
  abstract appendScanHistory(entry: ScanHistoryEntry): Promise<void>;
}