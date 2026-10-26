import { NextResponse, type NextRequest } from "next/server";
import { databaseConfigured, transaction } from "@/lib/db";
import { hashPassword } from "@/lib/server/passwords";
import { createSession, setSessionCookie } from "@/lib/server/sessions";
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

/** Raised by the transaction below when the email is already registered. */
const UNIQUE_VIOLATION = "23505";

export async function POST(request: NextRequest) {
  if (!databaseConfigured()) {
    return jsonError("Accounts are not enabled on this deployment.", 503);
  }

  const wait = await rateLimit("signup", clientKey(request), 5, 60 * 60 * 1000);
  if (wait) return tooManyRequests(wait);

  const parsed = validateCredentials(await readJsonBody(request));
  if (parsed.error !== undefined) return jsonError(parsed.error, 400);

  const passwordHash = await hashPassword(parsed.password);

  try {
    const user = await transaction(async (client) => {
      const inserted = await client.query<{ id: string; email: string }>(
        `INSERT INTO users (email) VALUES ($1) RETURNING id, email`,
        [parsed.email],
      );
      const row = inserted.rows[0];
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_id, password_hash)
         VALUES ($1, 'password', $2, $3)`,
        [row.id, parsed.email, passwordHash],
      );
      return row;
    });

    const { token, expiresAt } = await createSession(
      user.id,
      request.headers.get("user-agent"),
    );
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
      return jsonError("That email is already registered. Sign in instead.", 409);
    }
    throw error;
  }
}
