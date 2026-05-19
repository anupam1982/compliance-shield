import { runMigrations } from "../db/migrations/runMigrations";

runMigrations()
  .then(() => {
    console.log("Migrations completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });