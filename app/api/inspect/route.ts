import { NextRequest, NextResponse } from "next/server";
import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function unique(values: string[]) {
  return [...new Set(values)].slice(0, 12);
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

  try {
    const response = await safeFetch(target, {
      timeoutMs: 8000,
      maxBytes: 1_500_000,
      maxRedirects: 0,
      headers: { "user-agent": "PRISM public preview inspector/0.1" },
    });
    if (response.status >= 300 && response.status < 400) {
      response.close();
      return NextResponse.json(
        { error: "Redirected URLs must be submitted directly." },
        { status: 400 },
      );
    }
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
    const title =
      html
        .match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<[^>]+>/g, "")
        .trim() || "";
    const headings = unique(
      [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map((match) =>
          match[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean),
    );
    const colors = unique(
      [...html.matchAll(/#[0-9a-f]{6}\b/gi)].map((match) =>
        match[0].toLowerCase(),
      ),
    );
    return NextResponse.json({
      url: target.toString(),
      sourceType: "reconstructed preview",
      title,
      headings,
      colors,
      confidence: colors.length || headings.length ? "medium" : "low",
      note: "This result was reconstructed from public HTML and visible token hints. It is not a live editable copy of the source page.",
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
  }
}
