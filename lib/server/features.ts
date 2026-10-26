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
 * - `on` — accounts are enabled. If `DATABASE_URL` is missing this is a
 *   misconfiguration, and the routes are deliberately left to fail loudly
 *   rather than quietly serving a local-only app that was meant to sync.
 */
export type AccountsFlag = "on" | "off" | "auto";

export function accountsFlag(): AccountsFlag {
  const raw = process.env.CHROMIQ_ACCOUNTS?.trim().toLowerCase();
  if (raw === "off" || raw === "0" || raw === "false") return "off";
  if (raw === "on" || raw === "1" || raw === "true") return "on";
  return "auto";
}

export function accountsEnabled() {
  const flag = accountsFlag();
  if (flag === "off") return false;
  if (flag === "on") return true;
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
