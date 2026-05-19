import { createOverrideAuditsTable } from "./createOverrideAuditsTable";
import { updateOverrideAuditsTable } from "./updateOverrideAuditsTable";

export async function runMigrations() {
  console.log("Running database migrations...");
  await createOverrideAuditsTable();
  await updateOverrideAuditsTable();
  console.log("Database migrations completed.");
}