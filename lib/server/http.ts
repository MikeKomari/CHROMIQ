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

/**
 * How many proxies sit in front of this deployment.
 *
 * One is the common case and the default: a CDN or a single reverse proxy.
 * Zero means the app is reachable directly, so no forwarding header can be
 * believed at all and every caller shares one bucket -- heavy-handed, but it
 * fails towards limiting too much rather than too little.
 */
function trustedProxyHops() {
  // A blank value is "not set", not zero. `Number("")` is 0, so reading this
  // straight through would turn a commented-out line in .env into "trust no
  // header", quietly collapsing every caller into one bucket.
  const text = process.env.CHROMIQ_TRUSTED_PROXY_HOPS?.trim();
  if (!text) return 1;
  const raw = Number(text);
  if (!Number.isInteger(raw) || raw < 0) return 1;
  return Math.min(raw, 10);
}

/**
 * Who to count a request against, for rate limiting.
 *
 * This used to read the FIRST entry of `x-forwarded-for`, which is the one
 * entry in the header the client controls: a proxy appends what it saw, so
 * anything the caller sent stays in front of it. Rotating the header
 * therefore bought a fresh quota on every route. Measured: the feedback
 * endpoint allows five reports an hour, and thirteen went in -- five
 * honestly, then eight more with a different spoofed address each time. The
 * same trick lifted the per-address limit off the login route, leaving only
 * the per-account one.
 *
 * So the chain is counted from the RIGHT instead. With one proxy in front,
 * the last entry is the address that proxy actually observed, and whatever
 * the client prepended sits harmlessly before it. `CHROMIQ_TRUSTED_PROXY_HOPS`
 * moves the position for a deployment with more than one.
 */
export function clientKey(request: NextRequest) {
  const hops = trustedProxyHops();
  if (hops === 0) return "unknown";

  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (chain.length) {
    // The entry the nearest trusted proxy wrote. Clamped, so a short chain
    // cannot be used to walk off the front of the list into a forged value.
    return chain[Math.max(0, chain.length - hops)];
  }

  // Set by the proxy in the same way, and trusted on the same terms.
  return request.headers.get("x-real-ip")?.trim() || "unknown";
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
