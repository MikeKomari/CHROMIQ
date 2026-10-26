import { NextResponse } from "next/server";
import { accountsEnabled } from "@/lib/server/features";
import { clearSessionCookie, destroySession } from "@/lib/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Signing out has to work even once accounts are switched off, otherwise a
  // browser holding a session cookie from before the flag flipped would keep
  // sending it with no way to clear it. Dropping the cookie is the part that
  // matters to the caller; deleting the server row needs a database.
  //
  // The row is therefore left behind, and would still be accepted if accounts
  // were switched back on. That is deliberate: trying to delete it would make
  // every sign-out wait out the connection timeout that this flag exists to
  // avoid. The row cannot be reached without the token, the caller no longer
  // has it, and `expires_at` collects it within 30 days either way. Anyone who
  // captured the token before the flag flipped keeps it until then — the same
  // exposure as a stolen token on a deployment where sign-out never ran.
  if (!accountsEnabled()) {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
