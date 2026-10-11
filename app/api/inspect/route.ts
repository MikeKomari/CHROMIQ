import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function isPrivateIp(address: string) {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      octets[0] === 0
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

async function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host === "::1")
    return true;
  if (isPrivateIp(host)) return true;
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.some(({ address }) => isPrivateIp(address));
  } catch {
    return true;
  }
}

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
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    (await isBlockedHost(target.hostname))
  )
    return NextResponse.json(
      { error: "Only public HTTP(S) URLs can be inspected." },
      { status: 400 },
    );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "user-agent": "PRISM public preview inspector/0.1" },
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400)
      return NextResponse.json(
        { error: "Redirected URLs must be submitted directly." },
        { status: 400 },
      );
    if (!response.ok)
      return NextResponse.json(
        { error: `The page responded with HTTP ${response.status}.` },
        { status: 502 },
      );
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html"))
      return NextResponse.json(
        { error: "The URL did not return an HTML page." },
        { status: 415 },
      );
    const html = (await response.text()).slice(0, 1_500_000);
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
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "The inspection timed out after 8 seconds."
        : "The page could not be fetched from the server.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
