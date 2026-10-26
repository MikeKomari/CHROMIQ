import { NextResponse } from "next/server";
import { databaseConfigured, query } from "@/lib/db";
import { jsonError } from "@/lib/server/http";
import { clearSessionCookie, getSessionUser } from "@/lib/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The client calls this on boot to decide between local-only and synced mode. */
export async function GET() {
  if (!databaseConfigured()) {
    return NextResponse.json({ user: null, accountsEnabled: false });
  }
  const user = await getSessionUser();
  return NextResponse.json({ user, accountsEnabled: true });
}

/**
 * Deletes the signed-in account and everything attached to it.
 *
 * One statement is enough: `auth_identities`, `sessions`, `projects` and
 * `shares` all reference `users (id) ON DELETE CASCADE`, so the row going away
 * takes the password hash, every session, every synced project and every short
 * link with it. The privacy page promises exactly this, and it used to be
 * reachable only by emailing a mailbox that did not exist yet.
 *
 * Nothing in localStorage is touched, because the server cannot see it. The
 * client clears its own copy after a successful delete.
 */
export async function DELETE() {
  if (!databaseConfigured()) {
    return jsonError("Accounts are not enabled on this deployment.", 503);
  }

  const user = await getSessionUser();
  if (!user) return jsonError("Sign in to delete your account.", 401);

  await query(`DELETE FROM users WHERE id = $1`, [user.id]);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
