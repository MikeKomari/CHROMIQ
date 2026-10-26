import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, queryOne } from "@/lib/db";
import { getSessionUser } from "@/lib/server/sessions";
import { rateLimit } from "@/lib/server/rate-limit-db";
import { pruneExpiredShares, shareExpiryFrom } from "@/lib/server/shares";
import { clientKey, jsonError, readJsonBody, tooManyRequests } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SHARE_BYTES = 256 * 1024;
const UNIQUE_VIOLATION = "23505";

// Crockford-style alphabet: no I, L, O or U, so a slug read aloud or copied by
// hand does not turn into a different link.
const ALPHABET = "23456789abcdefghjkmnpqrstvwxyz";

function makeSlug(length = 10) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Creates a short read-only link. Anonymous sharing is allowed, because sharing
 * a direction for review is the one collaboration feature that should not
 * require an account.
 */
export async function POST(request: NextRequest) {
  if (!databaseConfigured()) {
    return jsonError("Short links are not enabled on this deployment.", 503);
  }

  const user = await getSessionUser();
  const wait = await rateLimit(
    "share:create",
    user ? `user:${user.id}` : clientKey(request),
    user ? 120 : 20,
    60 * 60 * 1000,
  );
  if (wait) return tooManyRequests(wait);

  const body = await readJsonBody(request);
  if (typeof body !== "object" || body === null) {
    return jsonError("Send a JSON body with the token system to share.", 400);
  }
  const { data } = body as { data?: unknown };
  if (typeof data !== "object" || data === null) {
    return jsonError("The shared data must be an object.", 400);
  }
  if (JSON.stringify(data).length > MAX_SHARE_BYTES) {
    return jsonError("That system is too large to share as a link.", 400);
  }

  // Housekeeping on the write path: no cron to depend on, and creating a share
  // is rare enough that the extra statement does not matter.
  void pruneExpiredShares().catch(() => {});

  const expiresAt = shareExpiryFrom();

  // Retry on the vanishingly unlikely slug collision rather than failing the
  // user's share action.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = makeSlug();
    try {
      const row = await queryOne<{ slug: string; created_at: Date; expires_at: Date }>(
        `INSERT INTO shares (slug, user_id, data, expires_at) VALUES ($1, $2, $3, $4)
         RETURNING slug, created_at, expires_at`,
        [slug, user?.id ?? null, data, expiresAt],
      );
      return NextResponse.json({ share: row }, { status: 201 });
    } catch (error) {
      if ((error as { code?: string }).code !== UNIQUE_VIOLATION) throw error;
    }
  }
  return jsonError("Could not create a share link. Try again.", 500);
}
