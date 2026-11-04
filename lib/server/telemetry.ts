import { query } from "@/lib/db";
import { databaseConfigured } from "@/lib/db";

/**
 * Server-side recording for CHROMIQ-1005.
 *
 * Two rules, and both are enforced here rather than left to each caller:
 *
 * 1. Recording never fails the thing it is recording. Every write is
 *    fire-and-forget and every error is swallowed. An observability outage
 *    that takes down the proxy is worse than no observability.
 * 2. Nothing personal goes in. The column set has no room for an address, an
 *    account or a user agent, and the text fields are truncated here so a
 *    caller cannot accidentally post a whole page or a stack full of URLs.
 */

export type TelemetryKind = "error" | "failure" | "vital" | "feature";
export type TelemetrySurface = "client" | "server";

export type TelemetryEvent = {
  kind: TelemetryKind;
  name: string;
  reason?: string | null;
  detail?: string | null;
  value?: number | null;
};

/** Long enough for a message and a digest, short enough not to store a page. */
export const MAX_DETAIL = 500;
const MAX_NAME = 80;
const MAX_REASON = 80;

export const TELEMETRY_KINDS: TelemetryKind[] = ["error", "failure", "vital", "feature"];

/**
 * Telemetry is off unless it is switched on, and it needs somewhere to write.
 *
 * The flag is NEXT_PUBLIC_ so one value answers for both sides: the client can
 * skip the request entirely when it is off, instead of firing a beacon at a
 * route that will only discard it.
 */
export function telemetryEnabled() {
  const raw = process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY?.trim().toLowerCase();
  if (raw !== "on" && raw !== "1" && raw !== "true") return false;
  return databaseConfigured();
}

/** The deployment a row came from, so a spike can be tied to a release. */
function release() {
  const value =
    process.env.NEXT_PUBLIC_CHROMIQ_RELEASE ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA;
  return value ? value.slice(0, 40) : null;
}

function clamp(value: string | null | undefined, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Writes events. Returns the number accepted, which is 0 when telemetry is off
 * or the write failed -- the caller is not expected to care either way.
 */
export async function record(
  events: TelemetryEvent[],
  surface: TelemetrySurface,
): Promise<number> {
  if (!telemetryEnabled() || events.length === 0) return 0;

  const rows = events.filter((event) => TELEMETRY_KINDS.includes(event.kind) && event.name);
  if (!rows.length) return 0;

  const at = release();
  const values: unknown[] = [];
  const tuples = rows.map((event, index) => {
    const base = index * 7;
    values.push(
      event.kind,
      surface,
      clamp(event.name, MAX_NAME),
      clamp(event.reason, MAX_REASON),
      clamp(event.detail, MAX_DETAIL),
      typeof event.value === "number" && Number.isFinite(event.value) ? event.value : null,
      at,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  try {
    await query(
      `INSERT INTO telemetry_events (kind, surface, name, reason, detail, value, release)
       VALUES ${tuples.join(", ")}`,
      values,
    );
    return rows.length;
  } catch {
    // Observability is not worth an outage. Nothing is retried and nothing is
    // raised: a lost row is a lost row.
    return 0;
  }
}

/**
 * Records a route failure without making the caller wait for it.
 *
 * Use this on the paths that reach out to arbitrary public hosts -- the proxy
 * and the inspector -- where the point is to see which failure modes dominate,
 * not which addresses were tried.
 */
export function recordFailure(name: string, reason: string, detail?: string) {
  void record([{ kind: "failure", name, reason, detail }], "server").catch(() => {});
}
