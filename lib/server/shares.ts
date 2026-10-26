import { query } from "@/lib/db";

/**
 * How long a short link stays resolvable.
 *
 * Shares are the one thing CHROMIQ stores for people who never made an
 * account, so they cannot be tied to anyone and cannot be deleted on request.
 * Keeping them forever would mean holding data indefinitely with no way for
 * the person who created it to get it back out, so they expire instead. A year
 * is long enough that a link in a design review or a pull request still works
 * months later, and short enough to be an honest retention promise.
 *
 * Signed-in users do not have to wait: they can delete their own shares at any
 * time through DELETE /api/shares/[slug].
 */
export const SHARE_TTL_DAYS = 365;

export function shareExpiryFrom(now = Date.now()) {
  return new Date(now + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Removes shares whose expiry has passed. The read path already refuses to
 * resolve them, so this is about not keeping the data, not about correctness.
 */
export async function pruneExpiredShares() {
  await query(`DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at <= now()`);
}
