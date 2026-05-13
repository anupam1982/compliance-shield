import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
async function testConnection(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined
  });

  try {
    console.log("Connecting to database...");

    const result = await pool.query("select now() as current_time");

    console.log("✅ Database connection successful");
    console.log(result.rows[0]);

    await pool.end();

    process.exit(0);
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);

    process.exit(1);
  }
}

void testConnection();