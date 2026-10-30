import { readFileSync } from "node:fs";

import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import { parseIntoClientConfig } from "pg-connection-string";

// One pool per process. Next.js recreates modules on hot reload in development,
// so the pool is parked on globalThis to avoid leaking connections into
// PgBouncer on every edit.
const globalForDb = globalThis as typeof globalThis & {
  chromiqPool?: Pool;
};

/**
 * The CA certificate that signs the database server's certificate, as PEM
 * text, or undefined when none is configured.
 *
 * PGSSLROOTCERT carries a file path on a developer's machine and the
 * certificate's own text on a serverless host, where a path into somebody
 * else's filesystem means nothing. Both are accepted; the PEM armour is what
 * tells them apart.
 */
function rootCertificate() {
  const value = process.env.PGSSLROOTCERT?.trim();
  if (!value) return undefined;
  if (value.startsWith("-----BEGIN")) return value;
  try {
    return readFileSync(value, "utf8");
  } catch (cause) {
    throw new Error(
      `PGSSLROOTCERT is set to ${JSON.stringify(value)}, which is neither PEM ` +
        "text nor a readable file. Give it the certificate's contents or a path " +
        "to them; see .env.example.",
      { cause },
    );
  }
}

/**
 * Connection settings for `connectionString` with the configured CA applied.
 *
 * node-postgres cannot just be handed `{ connectionString, ssl }`. Its
 * ConnectionParameters does `Object.assign({}, config, parse(connectionString))`,
 * so whatever the connection string says about TLS replaces the `ssl` passed
 * beside it, and a URL carrying `sslmode=` discards the CA without a word.
 * The CA has to be merged into the parsed settings instead, which means
 * parsing here with the same library node-postgres parses with.
 *
 * Exported for the tests: this is the kind of wiring that looks right and
 * silently is not.
 */
export function connectionConfig(connectionString: string): PoolConfig {
  const ca = rootCertificate();
  // No CA to inject. Leave the string to node-postgres, which reads an
  // `sslrootcert=` path out of it by itself.
  if (!ca) return { connectionString };

  const parsed = parseIntoClientConfig(connectionString);
  // `sslmode=disable` is a decision rather than an oversight, and adding a CA
  // would quietly override it. Everything else gets the CA, including a string
  // that says nothing about TLS: supplying a certificate is a statement of
  // intent to verify one, and failing loudly on connect beats verifying
  // nothing in silence.
  if (parsed.ssl === false) return parsed;
  const ssl = typeof parsed.ssl === "object" && parsed.ssl !== null ? parsed.ssl : {};
  return { ...parsed, ssl: { ...ssl, ca } };
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Accounts and cloud sync are disabled without it; see .env.example.",
    );
  }
  return new Pool({
    ...connectionConfig(connectionString),
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
