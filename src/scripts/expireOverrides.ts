import { getPostgresPool } from "../db/postgres";

async function expireOverrides() {
  const pool = getPostgresPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    update override_audits
    set status = 'EXPIRED'
    where expires_at is not null
    and expires_at < now()
    and status = 'ACTIVE'
  `);

  console.log("Expired overrides updated.");
}

expireOverrides()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });