import { Pool, type PoolClient, type QueryResultRow } from "pg";

// One pool per process. Next.js recreates modules on hot reload in development,
// so the pool is parked on globalThis to avoid leaking connections into
// PgBouncer on every edit.
const globalForDb = globalThis as typeof globalThis & {
  chromiqPool?: Pool;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Accounts and cloud sync are disabled without it; see .env.example.",
    );
  }
  return new Pool({
    connectionString,
    // PgBouncer runs in transaction mode, so server-side prepared statements
    // cannot be reused across checkouts. node-postgres only prepares when a
    // query is given a name, which we never do.
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool() {
  if (!globalForDb.chromiqPool) globalForDb.chromiqPool = createPool();
  return globalForDb.chromiqPool;
}

/** True when the app is configured for accounts and cloud sync. */
export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return getPool().query<T>(text, params as never);
}

/** Returns the first row, or null when the query matched nothing. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* the connection is already broken; the pool will discard it */
    }
    throw error;
  } finally {
    client.release();
  }
}
