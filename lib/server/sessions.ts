import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query, queryOne } from "@/lib/db";

export const SESSION_COOKIE = "chromiq_session";

/** Sessions last 30 days, refreshed when a request arrives past the halfway mark. */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = SESSION_TTL_MS / 2;

export type SessionUser = { id: string; email: string };

/** The raw token goes to the browser; only its hash is ever stored. */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(token), expiresAt, userAgent?.slice(0, 500) ?? null],
  );
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the caller from the session cookie, or null when there is no valid
 * session. Expired rows are deleted on sight so they do not accumulate.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<{
    id: string;
    user_id: string;
    email: string;
    expires_at: Date;
    last_seen_at: Date;
  }>(
    `SELECT s.id, s.user_id, s.expires_at, s.last_seen_at, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [hashToken(token)],
  );
  if (!row) return null;

  if (row.expires_at.getTime() <= Date.now()) {
    await query(`DELETE FROM sessions WHERE id = $1`, [row.id]);
    return null;
  }

  // Sliding expiry, but only written once past the halfway mark so a busy tab
  // does not issue an UPDATE on every request.
  if (Date.now() - row.last_seen_at.getTime() > REFRESH_AFTER_MS) {
    await query(
      `UPDATE sessions
          SET last_seen_at = now(), expires_at = now() + interval '30 days'
        WHERE id = $1`,
      [row.id],
    );
  }

  return { id: row.user_id, email: row.email };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  try {
    if (token) {
      await query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
    }
  } finally {
    // The cookie goes even if the delete failed. A database outage used to
    // leave the browser signed in: the route threw before reaching this line,
    // so the user saw an error and kept a working session cookie. Dropping the
    // cookie first is the half that is always safe to do.
    await clearSessionCookie();
  }
}

/** Signs every other device out, keeping the current session alive. */
export async function destroyOtherSessions(userId: string) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  await query(
    `DELETE FROM sessions WHERE user_id = $1 AND token_hash IS DISTINCT FROM $2`,
    [userId, token ? hashToken(token) : null],
  );
}

/**
 * Housekeeping for expired rows; safe to call from any request path.
 *
 * Errors are swallowed because every caller is doing this opportunistically
 * alongside work that has already succeeded, and a failed cleanup must not
 * turn a successful sign-in into an error.
 */
export async function pruneExpiredSessions() {
  try {
    await query(`DELETE FROM sessions WHERE expires_at <= now()`);
  } catch {
    /* housekeeping only; never surface this to the caller */
  }
}
