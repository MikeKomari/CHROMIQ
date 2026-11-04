import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { databaseEnabled } from "@/lib/server/features";
import { getSessionUser } from "@/lib/server/sessions";
import { clientKey, jsonError, readJsonBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS = ["site", "bug", "idea"] as const;
type Topic = (typeof TOPICS)[number];

const MIN_MESSAGE = 4;
const MAX_MESSAGE = 4000;
const MAX_URL = 2048;
const MAX_CONTACT = 320;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Keeps the stored URL to something that could plausibly be the address that
 * failed. The field is prefilled by the app but editable, so it is re-checked
 * here rather than trusted.
 */
function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.length > MAX_URL) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Receives a report from the in-product feedback form (CHROMIQ-1007).
 *
 * Open to anyone, because the person who most needs it is the one whose page
 * would not load and who has no account. That makes the rate limit the only
 * thing standing between this table and a flood, so it is tight and keyed per
 * caller, and the message is length-capped before it reaches the column.
 */
export async function POST(request: NextRequest) {
  if (!databaseEnabled()) {
    return jsonError(
      "Feedback is not enabled on this deployment. Please use the email address on the privacy page.",
      503,
    );
  }

  const wait = await rateLimit("feedback", clientKey(request), 5, 60 * 60 * 1000);
  if (wait) {
    return jsonError(
      "That is several reports in a short time. Please try again a little later.",
      429,
      { retryAfter: wait },
    );
  }

  const body = await readJsonBody(request);
  if (typeof body !== "object" || body === null) {
    return jsonError("Send a JSON body with a topic and a message.", 400);
  }
  const { topic, message, subjectUrl, contact } = body as Record<string, unknown>;

  if (typeof topic !== "string" || !TOPICS.includes(topic as Topic)) {
    return jsonError("Choose what the report is about.", 400);
  }
  if (typeof message !== "string" || message.trim().length < MIN_MESSAGE) {
    return jsonError("Tell us a little about what happened.", 400);
  }
  if (message.length > MAX_MESSAGE) {
    return jsonError(`Please keep it under ${MAX_MESSAGE} characters.`, 400);
  }
  // An address is optional: a report with no way to reply is still useful, and
  // demanding one would turn a bug report into a sign-up.
  if (contact !== undefined && contact !== null && contact !== "") {
    if (typeof contact !== "string" || contact.length > MAX_CONTACT || !EMAIL.test(contact.trim())) {
      return jsonError("That email address does not look right. Leave it blank to stay anonymous.", 400);
    }
  }

  const user = await getSessionUser();

  try {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO feedback (topic, message, subject_url, contact, user_id, release)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        topic,
        message.trim(),
        cleanUrl(subjectUrl),
        typeof contact === "string" && contact.trim() ? contact.trim().toLowerCase() : null,
        user?.id ?? null,
        process.env.NEXT_PUBLIC_CHROMIQ_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ],
    );
    return NextResponse.json({ ok: true, id: row?.id }, { status: 201 });
  } catch {
    // Say so plainly. A report that silently vanished is worse than one the
    // sender knows to send another way.
    return jsonError(
      "The report could not be saved. Please try again, or use the email address on the privacy page.",
      500,
    );
  }
}
