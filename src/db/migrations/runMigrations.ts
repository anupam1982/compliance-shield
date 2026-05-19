import { createOverrideAuditsTable } from "./createOverrideAuditsTable";

export async function runMigrations() {
  console.log("Running database migrations...");
  await createOverrideAuditsTable();

  console.log("Database migrations completed.");
}