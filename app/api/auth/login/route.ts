import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { accountsEnabled } from "@/lib/server/features";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/server/passwords";
import {
  createSession,
  pruneExpiredSessions,
  setSessionCookie,
} from "@/lib/server/sessions";
import { rateLimit } from "@/lib/server/rate-limit-db";
import {
  clientKey,
  jsonError,
  readJsonBody,
  tooManyRequests,
  validateCredentials,
} from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!accountsEnabled()) {
    return jsonError("Accounts are not enabled on this deployment.", 503);
  }

  const parsed = validateCredentials(await readJsonBody(request));
  if (parsed.error !== undefined) return jsonError(parsed.error, 400);

  // Limited per address and per account, so one attacker cannot lock everyone
  // out and one account cannot be ground down from many addresses.
  const byIp = await rateLimit("login:ip", clientKey(request), 20, 15 * 60_000);
  if (byIp) return tooManyRequests(byIp);
  const byAccount = await rateLimit("login:account", parsed.email, 10, 15 * 60_000);
  if (byAccount) return tooManyRequests(byAccount);

  const identity = await queryOne<{
    id: string;
    user_id: string;
    email: string;
    password_hash: string;
  }>(
    `SELECT i.id, i.user_id, i.password_hash, u.email
       FROM auth_identities i
       JOIN users u ON u.id = i.user_id
      WHERE i.provider = 'password' AND i.provider_id = $1`,
    [parsed.email],
  );

  const ok = identity
    ? await verifyPassword(parsed.password, identity.password_hash)
    : // Spend comparable time on an unknown address so response timing does not
      // reveal whether the account exists.
      await verifyPassword(parsed.password, await hashPassword(parsed.password)).then(
        () => false,
      );

  if (!identity || !ok) {
    return jsonError("That email and password do not match.", 401);
  }

  // Opportunistically upgrade hashes written with weaker parameters.
  if (needsRehash(identity.password_hash)) {
    const upgraded = await hashPassword(parsed.password);
    await query(
      `UPDATE auth_identities SET password_hash = $1, updated_at = now() WHERE id = $2`,
      [upgraded, identity.id],
    );
  }

  const { token, expiresAt } = await createSession(
    identity.user_id,
    request.headers.get("user-agent"),
  );
  await setSessionCookie(token, expiresAt);

  // Expired rows had no collector at all, so they accumulated indefinitely
  // along with the user_agent string each one carries. There is no cron in this
  // deployment, so this rides along with a sign-in, as share pruning rides
  // along with a write. It cannot fail the request.
  await pruneExpiredSessions();

  return NextResponse.json({ user: { id: identity.user_id, email: identity.email } });
}
