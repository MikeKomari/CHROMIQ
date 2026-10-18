/**
 * String-based HTML sanitizer for the restyle proxy. It is defense in depth:
 * the preview frame is also sandboxed without allow-scripts, so nothing here
 * is the only line of defense.
 */

const STRIP_WITH_CONTENT = ["script", "iframe", "frame", "frameset", "object", "embed", "applet"];

function stripElements(html: string, tag: string) {
  const pair = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
  const open = new RegExp(`<${tag}\\b[^>]*>?`, "gi");
  return html.replace(pair, "").replace(open, "");
}

function cleanTag(tag: string) {
  let out = tag.replace(
    /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    "",
  );
  out = out.replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(
    /(\s(?:href|src|action|formaction|xlink:href|data|poster)\s*=\s*)(["']?)\s*(?:javascript|vbscript|data:text\/html)[^"'\s>]*\2/gi,
    '$1"#"',
  );
  return out;
}

export function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function extractTitle(html: string) {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function visibleTextLength(html: string) {
  const body = html.match(/<body[\s\S]*$/i)?.[0] ?? html;
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Heuristic for client-rendered apps whose HTML is an empty shell. */
export function looksLikeSpa(rawHtml: string) {
  const hasRoot = /<div[^>]+id=["'](?:root|app|__next|__nuxt|___gatsby)["']/i.test(
    rawHtml,
  );
  const withoutScripts = rawHtml.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  return hasRoot && visibleTextLength(withoutScripts) < 200;
}

export function sanitizeHtml(rawHtml: string, baseUrl: string) {
  let html = rawHtml.replace(/<!--[\s\S]*?-->/g, (match) =>
    /^<!--\[if/i.test(match) ? "" : match,
  );
  for (const tag of STRIP_WITH_CONTENT) html = stripElements(html, tag);
  html = html.replace(/<\/?noscript\b[^>]*>/gi, "");
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*http-equiv\s*=[^>]*>/gi, "");
  html = html.replace(/<link\b[^>]*>/gi, (tag) =>
    /rel\s*=\s*["']?\s*modulepreload/i.test(tag) ||
    (/rel\s*=\s*["']?\s*preload/i.test(tag) && /as\s*=\s*["']?script/i.test(tag))
      ? ""
      : tag,
  );
  html = html.replace(/<[a-zA-Z][^<>]*>/g, cleanTag);

  const injected =
    `<base href="${escapeAttr(baseUrl)}">` +
    `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'">`;
  if (/<head\b[^>]*>/i.test(html))
    return html.replace(/<head\b[^>]*>/i, (open) => open + injected);
  if (/<html\b[^>]*>/i.test(html))
    return html.replace(/<html\b[^>]*>/i, (open) => `${open}<head>${injected}</head>`);
  return `<head>${injected}</head>${html}`;
}
