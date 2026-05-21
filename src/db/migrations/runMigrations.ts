import { createOverrideAuditsTable } from "./createOverrideAuditsTable";
import { updateOverrideAuditsTable } from "./updateOverrideAuditsTable";
import { updateScanMetricsTable } from "./updateScamMetricsTable";

export async function runMigrations() {
  console.log("Running database migrations...");
  await createOverrideAuditsTable();
  await updateOverrideAuditsTable();
  await updateScanMetricsTable();
  console.log("Database migrations completed.");
}