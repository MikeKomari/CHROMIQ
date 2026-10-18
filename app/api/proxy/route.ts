import { NextRequest, NextResponse } from "next/server";
import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";
import { acquireSlot, clientKey, rateLimit } from "@/lib/rate-limit";
import {
  extractTitle,
  looksLikeSpa,
  sanitizeHtml,
} from "@/lib/sanitize-html";

export const runtime = "nodejs";

const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;
const RATE_LIMIT_PER_MIN = 20;
const MAX_IN_FLIGHT = 8;

class ProxyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function decode(bytes: Uint8Array, contentType: string) {
  const header = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  const sniffed = new TextDecoder("utf-8")
    .decode(bytes.subarray(0, 2048))
    .match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  for (const label of [header, sniffed, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(bytes);
    } catch {
      continue;
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl)
    return NextResponse.json(
      { error: "Add a public URL to preview." },
      { status: 400 },
    );
  let target: URL;
  try {
    target = new URL(/^[a-z][a-z0-9+.-]*:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return NextResponse.json(
      { error: "Enter a complete URL, including https://." },
      { status: 400 },
    );
  }

  const wait = rateLimit("proxy", clientKey(request), RATE_LIMIT_PER_MIN);
  if (wait)
    return NextResponse.json(
      { error: "Too many previews in a short time. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  const release = acquireSlot(MAX_IN_FLIGHT);
  if (!release)
    return NextResponse.json(
      { error: "The preview service is busy. Please try again in a few seconds." },
      { status: 429, headers: { "Retry-After": "5" } },
    );
  try {
    const response = await safeFetch(target, {
      timeoutMs: TIMEOUT_MS,
      maxBytes: MAX_BYTES,
      maxRedirects: MAX_REDIRECTS,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PRISM restyle preview/0.1)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    target = response.finalUrl;
    if (response.status < 200 || response.status >= 300) {
      response.close();
      throw new ProxyError(`The page responded with HTTP ${response.status}.`, 502);
    }
    const contentType = String(response.headers["content-type"] || "");
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      response.close();
      throw new ProxyError("The URL did not return an HTML page.", 415);
    }
    const { bytes, truncated } = await response.readBody();
    const raw = decode(new Uint8Array(bytes), contentType);
    const finalUrl = target.toString();
    const notes = [
      "Scripts were removed — pages built entirely with JavaScript may appear empty or incomplete.",
    ];
    if (looksLikeSpa(raw))
      notes.push(
        "This looks like a client-rendered app. Without scripts it will most likely show little or no content, so restyling it here will not be representative.",
      );
    if (truncated)
      notes.push("The page was larger than 2 MB, so the end of it was cut off.");
    notes.push(
      "Fonts, images and styles load from the original site and may be blocked by it. Those third-party servers can also see your IP address when the preview loads their images, styles and fonts.",
    );
    return NextResponse.json({
      url: finalUrl,
      title: extractTitle(raw),
      html: sanitizeHtml(raw, finalUrl),
      notes,
    });
  } catch (error) {
    if (error instanceof ProxyError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SafeFetchError) {
      if (error.code === "blocked")
        return NextResponse.json(
          { error: "Only public HTTP(S) URLs can be previewed." },
          { status: 400 },
        );
      if (error.code === "too-many-redirects")
        return NextResponse.json({ error: "The page redirected too many times." }, { status: 502 });
      if (error.code === "bad-redirect")
        return NextResponse.json(
          { error: "The page redirected to an invalid address." },
          { status: 502 },
        );
      if (error.code === "timeout")
        return NextResponse.json(
          { error: "The page took longer than 10 seconds to respond." },
          { status: 504 },
        );
    }
    return NextResponse.json(
      { error: "The page could not be fetched from the server." },
      { status: 502 },
    );
  } finally {
    release();
  }
}
