import { NextRequest, NextResponse } from "next/server";
import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";
import { acquireSlot, clientKey, rateLimit } from "@/lib/rate-limit";
import {
  collectInlineStyles,
  extractDesign,
  extractPageText,
  findImports,
  findStylesheetLinks,
  looksClientRendered,
  suggestTokens,
} from "@/lib/css-extract";

export const runtime = "nodejs";

const STYLESHEET_LIMIT = 6;
const STYLESHEET_BYTES = 600_000;
const STYLESHEET_TOTAL_BYTES = 2_000_000;
const MAX_IN_FLIGHT = 4;
const REQUEST_DEADLINE_MS = 12_000;
/** Time kept back for parsing and responding once the network phases are over. */
const EXTRACTION_RESERVE_MS = 2_000;
const MIN_FETCH_MS = 600;
const HEX6 = /^#[0-9a-f]{6}$/;
const USER_AGENT = "CHROMIQ public preview inspector/0.1";

function resolveHttp(href: string, base: URL): URL | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Fetches one stylesheet through safeFetch; null on any failure or non-CSS response. */
async function fetchStylesheet(url: URL, timeoutMs: number): Promise<string | null> {
  try {
    const response = await safeFetch(url, {
      timeoutMs,
      maxBytes: STYLESHEET_BYTES,
      maxRedirects: 3,
      headers: { "user-agent": USER_AGENT, accept: "text/css,*/*;q=0.1" },
    });
    const type = String(response.headers["content-type"] || "").toLowerCase();
    if (response.status < 200 || response.status >= 300 || (type && !type.includes("text/css"))) {
      response.close();
      return null;
    }
    return new TextDecoder("utf-8").decode((await response.readBody()).bytes);
  } catch {
    return null;
  }
}

/** Fetches stylesheets in parallel and keeps results in order until the shared byte budget runs out. */
async function fetchStylesheets(urls: URL[], budget: { left: number }, deadline: number) {
  // Skip the phase entirely when little time is left; the failed count tells the user.
  const timeoutMs = Math.min(5000, deadline - Date.now() - EXTRACTION_RESERVE_MS);
  const results = timeoutMs < MIN_FETCH_MS ? urls.map(() => null) : await Promise.all(urls.map((url) => fetchStylesheet(url, timeoutMs)));
  const texts: (string | null)[] = [];
  let failed = 0;
  for (const text of results) {
    if (text === null) {
      failed++;
      texts.push(null);
    } else if (budget.left <= 0) {
      failed++;
      texts.push(null);
    } else {
      const kept = text.length > budget.left ? text.slice(0, budget.left) : text;
      budget.left -= kept.length;
      texts.push(kept);
    }
  }
  return { texts, failed };
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl)
    return NextResponse.json(
      { error: "Add a public URL to inspect." },
      { status: 400 },
    );
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "Enter a complete URL, including https://." },
      { status: 400 },
    );
  }
  const wait = rateLimit("inspect", clientKey(request), 30);
  if (wait)
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );

  const release = acquireSlot(MAX_IN_FLIGHT);
  if (!release)
    return NextResponse.json(
      { error: "The inspector is busy right now. Please try again in a few seconds." },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  const deadline = Date.now() + REQUEST_DEADLINE_MS;

  try {
    const response = await safeFetch(target, {
      timeoutMs: 8000,
      maxBytes: 1_500_000,
      maxRedirects: 3,
      headers: { "user-agent": USER_AGENT },
    });
    if (response.status < 200 || response.status >= 300) {
      response.close();
      return NextResponse.json(
        { error: `The page responded with HTTP ${response.status}.` },
        { status: 502 },
      );
    }
    const contentType = String(response.headers["content-type"] || "");
    if (!contentType.includes("text/html")) {
      response.close();
      return NextResponse.json(
        { error: "The URL did not return an HTML page." },
        { status: 415 },
      );
    }
    const html = new TextDecoder("utf-8").decode((await response.readBody()).bytes);
    const { title, headings } = extractPageText(html);
    const finalUrl = response.finalUrl;
    const budget = { left: STYLESHEET_TOTAL_BYTES };
    // Inline <style> blocks count against the same CSS byte budget as fetched sheets.
    const inlineCss: string[] = [];
    for (const block of collectInlineStyles(html)) {
      if (budget.left <= 0) break;
      const kept = block.length > budget.left ? block.slice(0, budget.left) : block;
      budget.left -= kept.length;
      inlineCss.push(kept);
    }
    const linkUrls = [...new Set(findStylesheetLinks(html))]
      .map((href) => resolveHttp(href, finalUrl))
      .filter((url): url is URL => url !== null)
      .slice(0, STYLESHEET_LIMIT);
    const linked = await fetchStylesheets(linkUrls, budget, deadline);
    // One level of @import, resolved against the sheet that declared it.
    const seen = new Set(linkUrls.map((url) => url.href));
    const importUrls: URL[] = [];
    [...linked.texts.map((text, i) => [text, linkUrls[i]] as const), ...inlineCss.map((text) => [text, finalUrl] as const)].forEach(
      ([text, base]) => {
        if (text === null) return;
        for (const href of findImports(text)) {
          const url = resolveHttp(href, base);
          if (url && !seen.has(url.href) && importUrls.length < STYLESHEET_LIMIT) {
            seen.add(url.href);
            importUrls.push(url);
          }
        }
      },
    );
    const imported = await fetchStylesheets(importUrls, budget, deadline);
    const css = [...imported.texts, ...linked.texts, ...inlineCss].filter(Boolean).join("\n");
    const extraction = extractDesign(html, css);
    const colors = extraction.colors
      .map((color) => color.hex)
      .filter((hex) => HEX6.test(hex))
      .slice(0, 12);
    return NextResponse.json({
      url: finalUrl.toString(),
      sourceType: "reconstructed preview",
      title,
      headings,
      colors,
      confidence: colors.length || headings.length ? "medium" : "low",
      note: "This result was reconstructed from public HTML, its linked stylesheets, and visible token hints. It is not a live editable copy of the source page.",
      stylesheets: {
        fetched: linked.texts.length - linked.failed + imported.texts.length - imported.failed,
        failed: linked.failed + imported.failed,
      },
      suggestion: suggestTokens(extraction),
      clientRendered: looksClientRendered(html),
    });
  } catch (error) {
    if (error instanceof SafeFetchError && error.code === "blocked")
      return NextResponse.json(
        { error: "Only public HTTP(S) URLs can be inspected." },
        { status: 400 },
      );
    const message =
      error instanceof SafeFetchError && error.code === "timeout"
        ? "The inspection timed out after 8 seconds."
        : "The page could not be fetched from the server.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    release();
  }
}
