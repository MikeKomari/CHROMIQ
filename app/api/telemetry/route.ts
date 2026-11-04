import { NextResponse, type NextRequest } from "next/server";
import { clientKey, readJsonBody } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit-db";
import {
  MAX_DETAIL,
  TELEMETRY_KINDS,
  record,
  telemetryEnabled,
  type TelemetryEvent,
} from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One page load sends a handful of vitals; a batch larger than this is noise. */
const MAX_EVENTS = 20;
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Where the browser posts what it saw (CHROMIQ-1005).
 *
 * This endpoint is open -- it has to be, since an error that happens before
 * sign-in is exactly the one worth seeing -- so everything it accepts is
 * treated as hostile: the batch is capped, every field is re-validated against
 * the same rules the server writer uses, and anything unrecognised is dropped
 * rather than stored.
 *
 * It answers 204 in every case, including when telemetry is off and when the
 * body was rubbish. The browser has nothing to do with the answer, and a
 * failing beacon that the client retries would be worse than a lost row.
 */
export async function POST(request: NextRequest) {
  if (!telemetryEnabled()) return new NextResponse(null, { status: 204 });

  // Keyed per caller like every other write path. The limit is generous: a
  // real session sends a few events, and a browser that sends more is not
  // worth a 429 it will never read.
  const wait = await rateLimit("telemetry", clientKey(request), 60, 60_000);
  if (wait) return new NextResponse(null, { status: 204 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });

  const body = await readJsonBody(request);
  if (typeof body !== "object" || body === null) {
    return new NextResponse(null, { status: 204 });
  }

  const { events } = body as { events?: unknown };
  if (!Array.isArray(events)) return new NextResponse(null, { status: 204 });

  const clean: TelemetryEvent[] = [];
  for (const entry of events.slice(0, MAX_EVENTS)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { kind, name, reason, detail, value } = entry as Record<string, unknown>;
    if (typeof kind !== "string" || !TELEMETRY_KINDS.includes(kind as never)) continue;
    if (typeof name !== "string" || !name.trim()) continue;
    clean.push({
      kind: kind as TelemetryEvent["kind"],
      name,
      reason: typeof reason === "string" ? reason : null,
      detail: typeof detail === "string" ? detail.slice(0, MAX_DETAIL) : null,
      value: typeof value === "number" && Number.isFinite(value) ? value : null,
    });
  }

  // `surface` is set here, not taken from the body: a client cannot claim its
  // report came from the server.
  await record(clean, "client");
  return new NextResponse(null, { status: 204 });
}
