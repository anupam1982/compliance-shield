import { ScanHistory } from "./scanHistory";
import { ScanState } from "./scanState";

export interface ComplianceStorage {
  loadScanState(): Promise<ScanState | null>;
  saveScanState(state: ScanState): Promise<void>;
  loadScanHistory(): Promise<ScanHistory>;
  appendScanHistory(entry: ScanHistory["entries"][number]): Promise<void>;
}