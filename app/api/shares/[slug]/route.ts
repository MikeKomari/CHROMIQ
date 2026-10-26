import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, query, queryOne } from "@/lib/db";
import { jsonError } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG = /^[23456789abcdefghjkmnpqrstvwxyz]{6,32}$/;

type Params = { params: Promise<{ slug: string }> };

/** Resolves a short link to the snapshot it was created from. */
export async function GET(_request: NextRequest, { params }: Params) {
  if (!databaseConfigured()) {
    return jsonError("Short links are not enabled on this deployment.", 503);
  }

  const { slug } = await params;
  if (!SLUG.test(slug)) return jsonError("That link is not valid.", 404);

  const row = await queryOne<{ data: unknown; created_at: Date; expires_at: Date | null }>(
    `SELECT data, created_at, expires_at FROM shares WHERE slug = $1`,
    [slug],
  );
  if (!row) return jsonError("That link has expired or never existed.", 404);
  if (row.expires_at && row.expires_at.getTime() <= Date.now()) {
    return jsonError("That link has expired.", 410);
  }

  // Fire-and-forget: a failed counter must never break opening a shared link.
  query(`UPDATE shares SET view_count = view_count + 1 WHERE slug = $1`, [slug]).catch(
    () => {},
  );

  return NextResponse.json(
    { data: row.data, createdAt: row.created_at },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}

/**
 * Revokes a short link.
 *
 * Only the signed-in account that created the share can do this. Anonymous
 * shares carry no owner, so there is nobody to authenticate against and no way
 * to tell the creator apart from anyone else holding the link; those are
 * cleaned up by their expiry instead. The privacy page says so in those words.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!databaseConfigured()) {
    return jsonError("Short links are not enabled on this deployment.", 503);
  }

  const { slug } = await params;
  if (!SLUG.test(slug)) return jsonError("That link is not valid.", 404);

  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to delete a share link.", 401);

  // Scoping the DELETE by user_id does the authorization in the statement, so
  // there is no window between checking the owner and acting on it. A share
  // owned by someone else is reported the same way as one that never existed,
  // which keeps the endpoint from confirming that a slug is real.
  const row = await queryOne<{ slug: string }>(
    `DELETE FROM shares WHERE slug = $1 AND user_id = $2 RETURNING slug`,
    [slug, user.id],
  );
  if (!row) return jsonError("That link does not exist, or is not yours to delete.", 404);

  return NextResponse.json({ ok: true });
}
