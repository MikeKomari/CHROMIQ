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

/** Parses a JSON body, returning null when it is absent or malformed. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
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
