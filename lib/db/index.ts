import { Pool, type PoolClient } from "pg";

// ---------------------------------------------------------------------------
// PostgreSQL connection pool — lazy initialization
// The pool is created on first use, not at module import time.
// This prevents build-time failures when DATABASE_URL is not available.
// ---------------------------------------------------------------------------

declare global {
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (globalThis._pgPool) return globalThis._pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Copy .env.example to .env.local and configure it."
    );
  }

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  pool.on("error", (err) => {
    console.error("[DB] Unexpected pool error:", err);
  });

  globalThis._pgPool = pool;
  return pool;
}

// ---------------------------------------------------------------------------
// Convenience query helpers
// ---------------------------------------------------------------------------

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.debug(`[DB] ${duration}ms | rows=${result.rowCount}`);
  }

  return result.rows as T[];
}

/** Run a query and return only the first row (or null) */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a callback inside a database transaction with automatic commit/rollback */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export default getPool;
