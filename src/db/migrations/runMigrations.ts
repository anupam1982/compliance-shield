import { createOverrideAuditsTable } from "./createOverrideAuditsTable";
import { updateOverrideAuditsTable } from "./updateOverrideAuditsTable";
import { updateScanMetricsTable } from "./updateScamMetricsTable";
import { runUsageEventsMigration } from "./createUsageEventsTable";
import { updateUsageEventsTable } from "./updateUsageEventsTable";

export async function runMigrations() {
  console.log("Running database migrations...");
  await createOverrideAuditsTable();
  await updateOverrideAuditsTable();
  await updateScanMetricsTable();
  await runUsageEventsMigration();
  await updateUsageEventsTable();
  console.log("Database migrations completed.");
}