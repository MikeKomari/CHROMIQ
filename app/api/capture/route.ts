import { NextResponse, type NextRequest } from "next/server";
import { acquireSlot } from "@/lib/rate-limit";
import { clientKey, jsonError } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit-db";
import { recordFailure } from "@/lib/server/telemetry";
import {
  CAPTURE_VIEWPORT_IDS,
  capture,
  captureAvailable,
  type CaptureViewport,
} from "@/lib/server/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A capture starts a browser, so it is far more expensive than any other route
 * here. Both limits are much tighter than the proxy's.
 */
const PER_MINUTE = 5;
const MAX_IN_FLIGHT = 2;

/**
 * GET /api/capture?url=…&viewport=desktop|tablet|mobile
 *
 * Reports availability with no `url`, so the client can hide the control on a
 * deployment with no browser rather than offering something that answers 501.
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();

  if (!rawUrl) {
    return NextResponse.json({
      available: await captureAvailable(),
      viewports: CAPTURE_VIEWPORT_IDS,
    });
  }

  let target: URL;
  try {
    target = new URL(/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return jsonError("Enter a complete URL, including https://.", 400);
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return jsonError("Only public HTTP(S) addresses can be captured.", 400);
  }

  const requested = request.nextUrl.searchParams.get("viewport") ?? "desktop";
  if (!CAPTURE_VIEWPORT_IDS.includes(requested as CaptureViewport)) {
    return jsonError(
      `Choose one of these sizes: ${CAPTURE_VIEWPORT_IDS.join(", ")}.`,
      400,
    );
  }
  const viewport = requested as CaptureViewport;

  if (!(await captureAvailable())) {
    // 501, not 500: nothing is broken, the feature is not present here.
    return NextResponse.json(
      {
        error:
          "Headless capture is not available on this deployment. Use the inspector or the restyle preview instead.",
        retryable: false,
      },
      { status: 501 },
    );
  }

  const wait = await rateLimit("capture", clientKey(request), PER_MINUTE);
  if (wait) {
    recordFailure("capture", "rate-limited");
    return NextResponse.json(
      {
        error: "Captures are limited to a few a minute. Please wait and try again.",
        retryable: true,
      },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  const release = acquireSlot(MAX_IN_FLIGHT);
  if (!release) {
    recordFailure("capture", "busy");
    return NextResponse.json(
      { error: "The capture service is busy. Please try again in a few seconds.", retryable: true },
      { status: 503, headers: { "Retry-After": "10" } },
    );
  }

  try {
    const outcome = await capture(target, viewport);
    if (!outcome.ok) {
      recordFailure("capture", outcome.reason);
      // The reason travels to the client so the UI can tell a retry worth
      // offering from one that will fail the same way again.
      return NextResponse.json(
        { error: outcome.message, reason: outcome.reason, retryable: outcome.retryable },
        { status: outcome.reason === "blocked" ? 400 : 502 },
      );
    }
    return NextResponse.json({ capture: outcome.capture });
  } finally {
    release();
  }
}
