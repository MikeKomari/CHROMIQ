import type { NextRequest } from "next/server";

// Best-effort, per-instance protection: state lives in this process's memory, so on
// serverless platforms each warm instance keeps its own counters. It blunts casual
// abuse; it is not a global quota.

const MAX_TRACKED = 5000;
const hits = new Map<string, { count: number; resetAt: number }>();

export function clientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Fixed-window limiter. Returns seconds to wait when limited, else 0. */
export function rateLimit(bucket: string, key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  if (hits.size >= MAX_TRACKED) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    // Still full of live entries: drop the oldest insertions.
    for (const k of hits.keys()) {
      if (hits.size < MAX_TRACKED * 0.9) break;
      hits.delete(k);
    }
  }
  const id = `${bucket}:${key}`;
  const entry = hits.get(id);
  if (!entry || entry.resetAt <= now) {
    hits.set(id, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  entry.count++;
  return entry.count > limit ? Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) : 0;
}

let inFlight = 0;

/** Global concurrency gate. Returns a release function, or null when full. */
export function acquireSlot(max: number) {
  if (inFlight >= max) return null;
  inFlight++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    inFlight--;
  };
}
