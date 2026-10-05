/**
 * Database migration runner
 * Runs all SQL migration files in order.
 * Usage: npx tsx database/migrate.ts
 *
 * Migrations are idempotent (use IF NOT EXISTS, CREATE OR REPLACE).
 * Safe to run multiple times.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set. Copy .env.example to .env.local and configure it.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const MIGRATIONS_DIR = join(process.cwd(), "database", "migrations");

const MIGRATION_FILES = [
  "001_schema.sql",
  "002_indexes.sql",
  "003_views.sql",
  "004_triggers.sql",
  "005_functions.sql",
];

async function runMigrations() {
  console.log("🗄️  Starting database migration...\n");

  const client = await pool.connect();

  try {
    for (const file of MIGRATION_FILES) {
      const filePath = join(MIGRATIONS_DIR, file);
      console.log(`  Running ${file}...`);

      const sql = readFileSync(filePath, "utf-8");

      try {
        await client.query(sql);
        console.log(`  ✓ ${file} completed`);
      } catch (err) {
        const error = err as Error;
        console.error(`  ✗ ${file} FAILED:`);
        console.error(`    ${error.message}`);
        throw err;
      }
    }

    console.log("\n✅  All migrations completed successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("\n❌  Migration failed:", err.message);
  process.exit(1);
});
