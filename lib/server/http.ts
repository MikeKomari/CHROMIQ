import { NextResponse, type NextRequest } from "next/server";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/** Best-effort caller identity for rate limiting. */
export function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * What a body over the cap reads as. A distinct value, not null, so a route
 * can answer 413 rather than "that JSON was malformed" -- but it is not an
 * object either, so a caller that only checks `typeof body === "object"`
 * still rejects it safely without being updated.
 */
export const BODY_TOO_LARGE = Symbol("body-too-large");

/** Nothing this app accepts as JSON is anywhere near a megabyte. */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

/**
 * Parses a JSON body, returning null when it is absent or malformed and
 * BODY_TOO_LARGE when it runs past `maxBytes`.
 *
 * The size is measured while reading rather than taken from Content-Length,
 * because that header is the client's claim and is simply absent on a chunked
 * request. Routes used to check it and then call `request.json()`, which
 * meant a `Transfer-Encoding: chunked` POST with no length header was parsed
 * in full however large it was -- 3 MB went through /api/telemetry, which is
 * unauthenticated, before anything looked at the content. Measured, not
 * theorised.
 *
 * Reading through the stream also means an oversized body is abandoned partway
 * instead of being buffered first and rejected afterwards.
 */
export async function readJsonBody(
  request: NextRequest,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<unknown> {
  const stream = request.body;
  // No stream at all: fall back to the simple path, which handles an empty or
  // already-buffered body.
  if (!stream) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // Stop pulling: the sender does not get to keep spending our memory.
        await reader.cancel().catch(() => {});
        return BODY_TOO_LARGE;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  try {
    const joined = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
      joined.set(chunk, at);
      at += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(joined));
  } catch {
    return null;
  }
}

/** True when a body was refused for its size, so the route can say 413. */
export function isBodyTooLarge(body: unknown): boolean {
  return body === BODY_TOO_LARGE;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CredentialResult =
  | { error: string; email?: undefined; password?: undefined }
  | { error?: undefined; email: string; password: string };

export function validateCredentials(body: unknown): CredentialResult {
  if (typeof body !== "object" || body === null) {
    return { error: "Send a JSON body with an email and password." };
  }
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || !EMAIL.test(email.trim()) || email.length > 320) {
    return { error: "Enter a valid email address." };
  }
  if (typeof password !== "string" || password.length < 10) {
    return { error: "Use a password of at least 10 characters." };
  }
  // scrypt cost scales with input length; cap it so a huge body cannot stall a worker.
  if (password.length > 200) {
    return { error: "That password is too long (200 characters maximum)." };
  }
  return { email: email.trim().toLowerCase(), password };
}
