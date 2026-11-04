import { queryOne } from "@/lib/db";
import { databaseEnabled } from "@/lib/server/features";
import { rateLimit as memoryRateLimit } from "@/lib/rate-limit";

/**
 * Fixed-window rate limiting backed by Postgres, so every serverless instance
 * counts against the same quota. Falls back to the per-process limiter when
 * the database is switched off or unconfigured, or when it is unreachable — a
 * limiter outage must not take the route down with it.
 *
 * Returns the number of seconds to wait, or 0 when the request is allowed.
 */
export async function rateLimit(
  bucket: string,
  subject: string,
  limit: number,
  windowMs = 60_000,
): Promise<number> {
  if (!databaseEnabled()) {
    return memoryRateLimit(bucket, subject, limit, windowMs);
  }

  // Align every instance onto the same window boundary, so the window cannot be
  // reset by whichever instance happens to see the request first.
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const row = await queryOne<{ count: number }>(
      `INSERT INTO rate_limits (bucket, subject, window_start, count)
            VALUES ($1, $2, $3, 1)
       ON CONFLICT (bucket, subject, window_start)
       DO UPDATE SET count = rate_limits.count + 1
         RETURNING count`,
      [bucket, subject, windowStart],
    );
    maybePrune(windowMs);
    const count = row?.count ?? 1;
    if (count <= limit) return 0;
    const resetAt = windowStart.getTime() + windowMs;
    return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  } catch {
    // Degrade to per-instance counting rather than failing open entirely.
    return memoryRateLimit(bucket, subject, limit, windowMs);
  }
}

/**
 * Housekeeping on the write path, because there is no cron in this deployment.
 *
 * Without this, `rate_limits` grows by one row per subject per window for ever:
 * a window that has closed can never be hit again, but nothing was deleting it.
 * Pruning on roughly one write in two hundred keeps the table bounded while
 * adding a statement to very few requests, and the delete is fire-and-forget
 * so it cannot slow down or fail the request that triggered it.
 */
const PRUNE_ODDS = 0.005;

function maybePrune(windowMs: number) {
  if (Math.random() >= PRUNE_ODDS) return;
  // Keep a few windows' worth of history: deleting the live window would hand
  // every caller a fresh quota.
  void pruneRateLimits(Math.max(10 * 60_000, windowMs * 3)).catch(() => {});
}

/**
 * Deletes windows that can no longer be hit. Cheap enough to call occasionally
 * from a request path; there is no cron in this deployment.
 */
export async function pruneRateLimits(olderThanMs = 10 * 60_000) {
  if (!databaseEnabled()) return;
  try {
    await queryOne(
      `DELETE FROM rate_limits WHERE window_start < $1`,
      [new Date(Date.now() - olderThanMs)],
    );
  } catch {
    /* housekeeping only; never surface this to the caller */
  }
}
