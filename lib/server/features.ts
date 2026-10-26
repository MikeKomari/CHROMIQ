import { databaseConfigured } from "@/lib/db";

/**
 * Whether accounts, sessions and cloud sync are available on this deployment.
 *
 * `DATABASE_URL` alone used to decide this, which was fine in production but
 * awkward to develop against: with the URL present but the host unreachable,
 * every auth and share route waited out the 10 second connection timeout
 * before failing, and removing the URL to get around that also disabled the
 * migration tooling that reads it.
 *
 * `CHROMIQ_ACCOUNTS` makes the decision explicit:
 *
 * - unset (the default) — follow `DATABASE_URL`. Existing deployments and the
 *   test suite behave exactly as they did before this flag existed.
 * - `off` — accounts are disabled even when `DATABASE_URL` is set. Every
 *   account, share and project route answers 503 without opening a connection,
 *   and `/api/auth/me` reports `accountsEnabled: false`, so the client hides
 *   the account controls and runs from localStorage. The restyle, inspect and
 *   export paths never touched the database and are unaffected.
 * - `on` — accounts are enabled whatever `DATABASE_URL` says. With no
 *   connection string the routes that need one answer 500 instead of
 *   pretending to be a local-only deployment, which is the louder and more
 *   honest failure for a deployment that was meant to sync. It is not loud in
 *   every case — `GET /api/auth/me` answers before touching the database when
 *   there is no session cookie — so a warning is logged as well.
 */
export type AccountsFlag = "on" | "off" | "auto";

const OFF_VALUES = new Set(["off", "0", "false", "no", "disable", "disabled"]);
const ON_VALUES = new Set(["on", "1", "true", "yes", "enable", "enabled"]);

/**
 * Warnings are deduplicated by message. These fire from request paths, and the
 * condition is a static misconfiguration, so logging once says everything that
 * repeating it per request would.
 */
const warned = new Set<string>();

function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[chromiq] ${message}`);
}

export function accountsFlag(): AccountsFlag {
  const raw = process.env.CHROMIQ_ACCOUNTS?.trim().toLowerCase();
  if (!raw) return "auto";
  if (OFF_VALUES.has(raw)) return "off";
  if (ON_VALUES.has(raw)) return "on";

  // Falling back to "auto" silently is the dangerous reading: with
  // DATABASE_URL set, an operator who wrote "disabled" or mistyped "of" would
  // get accounts switched on, which is the opposite of what they asked for.
  // The value cannot be honoured, so say so rather than guessing quietly.
  warnOnce(
    `CHROMIQ_ACCOUNTS is set to ${JSON.stringify(raw)}, which is not a value this build understands. ` +
      `Falling back to following DATABASE_URL. Use "on" or "off".`,
  );
  return "auto";
}

export function accountsEnabled() {
  const flag = accountsFlag();
  if (flag === "off") return false;
  if (flag === "on") {
    if (!databaseConfigured()) {
      warnOnce(
        "CHROMIQ_ACCOUNTS is \"on\" but DATABASE_URL is not set. Accounts, cloud sync and " +
          "short links will fail with a 500 until it is configured.",
      );
    }
    return true;
  }
  return databaseConfigured();
}

/**
 * True when the database is reachable in principle: either accounts are on, or
 * something else (the shared rate limiter) still wants a connection. Kept
 * separate from `accountsEnabled` so turning accounts off also stops the
 * limiter dialling a host that is not there.
 */
export function databaseEnabled() {
  return accountsEnabled() && databaseConfigured();
}
