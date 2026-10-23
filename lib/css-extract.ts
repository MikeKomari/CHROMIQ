import { fontCatalog } from "@/data/workspace";
import { hexToHsl, hslToHex } from "@/lib/colors";
import { contrastRatio } from "@/lib/contrast";
import type { Tokens } from "@/types/workspace";

/**
 * Pure CSS/HTML token extraction. Nothing here fetches, executes scripts, or
 * touches the server: callers hand in HTML and already-collected CSS text.
 */

export type ColorRole = "background" | "foreground" | "muted" | "line" | "accent" | "accentSoft";
type Candidate = { hex: string; rank: number; source: "var" | "rule" };
type Candidates = Record<ColorRole, Candidate[]>;
type FontRole = "display" | "body" | "mono" | "other";

export type Extraction = {
  /** Custom properties declared on :root/html/body, fully resolved where possible. */
  variables: Record<string, string>;
  /** Custom properties declared for the dark theme. */
  darkVariables: Record<string, string>;
  /** Every counted color across both themes, most frequent first. */
  colors: { hex: string; count: number }[];
  counts: { light: Record<string, number>; dark: Record<string, number> };
  candidates: { light: Candidates; dark: Candidates };
  fonts: Record<FontRole, Record<string, number>>;
  radii: number[];
  /** Declarations whose color could not be read (lab(), color-mix(), ...). */
  unsupported: number;
  /** True when reading stopped early (time budget or rule cap), so the result may be partial. */
  stopped: boolean;
};

export type Suggestion = {
  tokens: Partial<Tokens>;
  confidence: Record<"color" | "type" | "shape", "high" | "medium" | "low">;
  notes: string[];
};

const emptyCandidates = (): Candidates => ({
  background: [],
  foreground: [],
  muted: [],
  line: [],
  accent: [],
  accentSoft: [],
});

/* ---------- HTML helpers ---------- */

// Everything below runs on attacker-controlled bytes, so nothing here uses lazy
// multi-line regexes: tags are found with a linear scanner that always advances.
const TAG_CAP = 2048; // a "tag" longer than this is treated as plain text
const SCAN_CAP = 200_000; // markup read for titles, headings and the client-render check
const STYLE_BLOCK_CAP = 600_000;
const MAX_STYLE_BLOCKS = 50;
const MAX_LINKS = 200;
const TEXT_CAP = 200;
const MAX_HEADINGS = 12;

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((v) => v !== undefined);

const isNameCode = (c: number) => (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 45;
const RAW_CLOSE = { script: /<\/script/gi, style: /<\/style/gi };

/**
 * Calls visit for every tag in html[0..limit). `raw` is the index of the matching close tag for
 * <script>/<style> (-1 when never closed, -2 for any other tag); the scanner skips that content.
 * `from` is where the text before this tag starts. Return false from visit to stop. Returns the
 * index scanning ended at. Each step moves forward and a tag is capped at TAG_CAP, so the cost is linear.
 */
function eachTag(
  html: string,
  limit: number,
  visit: (name: string, closing: boolean, start: number, end: number, raw: number, from: number) => boolean | void,
): number {
  const stop = Math.min(html.length, limit);
  let i = 0;
  let from = 0;
  while (i < stop) {
    i = html.indexOf("<", i);
    if (i < 0 || i >= stop) return from;
    let j = i + 1;
    const closing = html.charCodeAt(j) === 47;
    if (closing) j++;
    const nameStart = j;
    while (j < stop && j - nameStart < 16 && isNameCode(html.charCodeAt(j))) j++;
    if (j === nameStart) {
      i = nameStart;
      continue;
    }
    const cap = Math.min(html.length, i + TAG_CAP);
    let k = j;
    while (k < cap) {
      const c = html.charCodeAt(k);
      if (c === 62 || c === 60) break;
      k++;
    }
    if (k >= cap || html.charCodeAt(k) !== 62) {
      i = k;
      continue;
    }
    const name = html.slice(nameStart, j).toLowerCase();
    const end = k + 1;
    let raw = -2;
    if (!closing && (name === "script" || name === "style")) {
      const re = RAW_CLOSE[name];
      re.lastIndex = end;
      raw = re.exec(html)?.index ?? -1;
    }
    if (visit(name, closing, i, end, raw, from) === false) return from;
    if (raw === -1) return html.length;
    if (raw >= 0) {
      const gt = html.indexOf(">", raw);
      i = gt < 0 ? html.length : gt + 1;
    } else i = end;
    from = i;
  }
  return from;
}

/** Tags removed without regex backtracking. */
function stripTags(text: string): string {
  let out = "";
  let i = 0;
  for (;;) {
    const lt = text.indexOf("<", i);
    if (lt < 0) return out + text.slice(i);
    out += text.slice(i, lt);
    const gt = text.indexOf(">", lt);
    if (gt < 0) return out;
    i = gt + 1;
  }
}

const clipText = (text: string) => stripTags(text).replace(/\s+/g, " ").trim().slice(0, TEXT_CAP);

export function collectInlineStyles(html: string): string[] {
  const out: string[] = [];
  eachTag(html, html.length, (name, closing, _start, end, raw) => {
    if (name !== "style" || closing) return;
    if (raw >= 0) out.push(html.slice(end, Math.min(raw, end + STYLE_BLOCK_CAP)));
    return out.length < MAX_STYLE_BLOCKS;
  });
  return out;
}

/** Raw href values of stylesheet links, in document order (screen/all media only). */
export function findStylesheetLinks(html: string): string[] {
  const hrefs: string[] = [];
  let seen = 0;
  eachTag(html, html.length, (name, closing, start, end) => {
    if (name !== "link" || closing) return;
    const tag = html.slice(start, end);
    const rel = (attr(tag, "rel") || "").toLowerCase().split(/\s+/);
    const href = attr(tag, "href");
    const media = (attr(tag, "media") || "").toLowerCase();
    if (rel.includes("stylesheet") && href && media !== "print") hrefs.push(href.replace(/&amp;/g, "&"));
    return ++seen < MAX_LINKS;
  });
  return hrefs;
}

/** Page title and up to 12 distinct h1-h3 texts, each clipped to 200 characters, read from the first 200 KB. */
export function extractPageText(html: string): { title: string; headings: string[] } {
  let title = "";
  let titleTries = 0;
  let headingTries = 0;
  const headings: string[] = [];
  const textAfter = (end: number, close: RegExp) => {
    const window = html.slice(end, end + 4000);
    const at = window.search(close);
    return at < 0 ? "" : clipText(window.slice(0, at));
  };
  eachTag(html, SCAN_CAP, (name, closing, _start, end) => {
    if (closing) return;
    if (name === "title") {
      if (!title && titleTries++ < 5) title = textAfter(end, /<\/title/i);
    } else if (name.length === 2 && name[0] === "h" && name[1] >= "1" && name[1] <= "3") {
      if (headings.length < MAX_HEADINGS && headingTries++ < 60) {
        const text = textAfter(end, /<\/h[1-3]/i);
        if (text && !headings.includes(text)) headings.push(text);
      }
    }
  });
  return { title, headings };
}

/** Raw URLs of @import rules. */
export function findImports(css: string): string[] {
  const urls: string[] = [];
  for (const m of stripComments(css).matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s)"';]+))/gi)) {
    const url = m[1] ?? m[2] ?? m[3];
    if (url) urls.push(url);
  }
  return urls;
}

/** True when the page has almost no text but mounts into a typical client-side root. */
export function looksClientRendered(html: string): boolean {
  let text = "";
  let skip = "";
  let root = false;
  let bodySeen = false;
  const room = () => !skip && text.length < 1000;
  const from = eachTag(html, SCAN_CAP, (name, closing, start, end, _raw, before) => {
    if (room()) text += " " + html.slice(before, Math.min(start, before + 1000));
    if (closing) {
      if (name === skip) skip = "";
    } else if (name === "body" && !bodySeen) {
      bodySeen = true;
      text = "";
    } else if (name === "noscript" || name === "template") {
      if (!skip) skip = name;
    } else if (name === "div" && !root) {
      const id = attr(html.slice(start, end), "id")?.toLowerCase();
      root = id === "root" || id === "__next" || id === "app" || id === "__nuxt";
    }
  });
  if (room()) text += " " + html.slice(from, from + 1000);
  return text.replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length < 400 && root;
}

/* ---------- Color parsing ---------- */

/** Drops /* ... *\/ comments (an unclosed one runs to the end) without regex backtracking. */
function stripComments(css: string) {
  let at = css.indexOf("/*");
  if (at < 0) return css;
  let out = "";
  let last = 0;
  while (at >= 0) {
    out += css.slice(last, at);
    const close = css.indexOf("*/", at + 2);
    if (close < 0) return out;
    last = close + 2;
    at = css.indexOf("/*", last);
  }
  return out + css.slice(last);
}
const stripImportant = (value: string) => {
  const trimmed = value.trimEnd();
  return /!important$/i.test(trimmed) ? trimmed.slice(0, -10).trimEnd() : trimmed;
};
const toByte = (n: number) => (Number.isFinite(n) ? Math.round(Math.max(0, Math.min(255, n))) : 0);
const hex2 = (n: number) => toByte(n).toString(16).padStart(2, "0");
const rgbHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const num = (token: string, percentScale = 1) =>
  token.endsWith("%") ? (parseFloat(token) / 100) * percentScale : parseFloat(token);

function alphaOk(token: string | undefined) {
  if (token === undefined) return true;
  const alpha = num(token, 1);
  return Number.isFinite(alpha) && alpha >= 0.5;
}

function oklchToHex(l: number, c: number, h: number) {
  l = Math.max(0, Math.min(1, l));
  c = Math.max(0, Math.min(0.5, c));
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ].map((v) => {
    const x = Math.max(0, Math.min(1, v));
    return (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055) * 255;
  });
  return rgbHex(lin[0], lin[1], lin[2]);
}

const HUE_UNITS: Record<string, number> = { "": 1, deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

/** A CSS hue (deg, grad, rad, turn or unitless) in degrees; NaN when unreadable or not finite. */
function parseHue(token: string): number {
  const m = token.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)?$/);
  if (!m) return NaN;
  const degrees = parseFloat(m[1]) * HUE_UNITS[m[2] ?? ""];
  return Number.isFinite(degrees) ? degrees : NaN;
}

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TRIPLE_RE = /^(-?[\d.]+)(deg|grad|rad|turn)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%$/;

/** One color token (hex, rgb, hsl, oklch, or a bare "h s% l%" triple) to #rrggbb. Null when unreadable or mostly transparent. */
export function parseColor(input: string): string | null {
  const value = stripImportant(input.trim().toLowerCase());
  if (value === "white") return "#ffffff";
  if (value === "black") return "#000000";
  const hexMatch = value.match(HEX_RE);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    if (h.length === 8) {
      if (parseInt(h.slice(6), 16) < 128) return null;
      h = h.slice(0, 6);
    }
    return `#${h}`;
  }
  const triple = value.match(TRIPLE_RE);
  if (triple) {
    const [h, s, l] = [parseHue(triple[1] + (triple[2] ?? "")), parseFloat(triple[3]), parseFloat(triple[4])];
    return [h, s, l].every(Number.isFinite) ? hslToHex(h, s, l) : null;
  }
  const fn = value.match(/^(rgba?|hsla?|oklch)\(([^()]*)\)$/);
  if (!fn) return null;
  const [main, slashAlpha] = fn[2].split("/").map((s) => s.trim());
  const args = main.split(/[\s,]+/).filter(Boolean);
  const alpha = slashAlpha ?? args[3];
  if (args.length < 3 || !alphaOk(alpha)) return null;
  if (fn[1] === "oklch") {
    const l = num(args[0], 1);
    const c = num(args[1], 0.4);
    const h = parseHue(args[2]);
    return [l, c, h].every(Number.isFinite) ? oklchToHex(l, c, h) : null;
  }
  if (fn[1].startsWith("hsl")) {
    const h = parseHue(args[0]);
    const s = parseFloat(args[1]);
    const l = parseFloat(args[2]);
    return [h, s, l].every(Number.isFinite) ? hslToHex(h, s, l) : null;
  }
  const rgb = args.slice(0, 3).map((a) => (a.endsWith("%") ? (parseFloat(a) / 100) * 255 : parseFloat(a)));
  return rgb.every(Number.isFinite) ? rgbHex(rgb[0], rgb[1], rgb[2]) : null;
}

const UNSUPPORTED_RE = /\b(?:oklab|lab|lch|hwb|color-mix|color)\(/i;
const COLOR_TOKEN_RE =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z])|\b(?:rgba?|hsla?|oklch)\([^()]*\)|\b(?:white|black)\b/gi;

/** Removes url(...) groups in one forward pass (an unclosed one swallows the rest). */
function stripUrls(value: string) {
  const starts = /url\(/gi;
  let out = "";
  let last = 0;
  for (let m = starts.exec(value); m; m = starts.exec(value)) {
    out += value.slice(last, m.index);
    const close = value.indexOf(")", m.index);
    if (close < 0) return out;
    last = close + 1;
    starts.lastIndex = last;
  }
  return out + value.slice(last);
}

function colorsIn(value: string): { colors: string[]; unsupported: boolean } {
  const clean = stripUrls(value);
  if (UNSUPPORTED_RE.test(clean)) return { colors: [], unsupported: true };
  const colors: string[] = [];
  for (const [token] of clean.matchAll(COLOR_TOKEN_RE)) {
    const hex = parseColor(token);
    if (hex) colors.push(hex);
  }
  return { colors, unsupported: false };
}

/** A declaration value that should be exactly one color. */
function singleColor(value: string): string | null {
  const first = parseColor(value);
  if (first) return first;
  const { colors } = colorsIn(value);
  return colors.length === 1 && /^[^\s]+$|^[a-z]+\([^()]*\)$/i.test(value.trim()) ? colors[0] : null;
}

/* ---------- CSS scanning ---------- */

const MAX_VALUE = 4096; // longest declaration value (and longest resolved value) we will read
const MAX_VAR_DEPTH = 8;
const MAX_RESOLVE_STEPS = 20_000;
const VAR_RE = /var\(\s*(--[^,)\s]{1,100})\s*(?:,\s*([^()]*))?\)/g;

/**
 * Resolves var() chains recursively (depth 8, cycle-guarded, memoised). A value that would grow past
 * 4 KB, or a chain that cannot be resolved, is left as written so callers can reject it by its `var(`.
 */
function makeResolver(vars: Map<string, string>, late: () => boolean) {
  const memo = new Map<string, string>();
  const visiting = new Set<string>();
  let steps = 0;

  const resolveValue = (value: string, depth: number): string => {
    if (!value.includes("var(") || depth > MAX_VAR_DEPTH) return value;
    let size = value.length;
    let overflow = false;
    const out = value.replace(VAR_RE, (whole, name: string, fallback?: string) => {
      if (overflow) return whole;
      const found = vars.get(name);
      let next: string;
      if (found === undefined) next = fallback ?? whole;
      else {
        const done = resolveVar(name, depth + 1);
        next = done.includes("var(") ? whole : done;
      }
      size += next.length - whole.length;
      if (size > MAX_VALUE) {
        overflow = true;
        return whole;
      }
      return next;
    });
    return overflow ? value : out;
  };

  const resolveVar = (name: string, depth: number): string => {
    const cached = memo.get(name);
    if (cached !== undefined) return cached;
    const raw = vars.get(name) ?? "";
    if (visiting.has(name) || ++steps > MAX_RESOLVE_STEPS || late()) return raw;
    visiting.add(name);
    const done = resolveValue(raw, depth).trim();
    visiting.delete(name);
    if (!done.includes("var(")) memo.set(name, done);
    return done;
  };

  return (value: string) => resolveValue(value, 0).trim();
}

/** Index of the "}" closing the block that opens at css[open]. */
function closingBrace(css: string, open: number) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === "\\") i++;
    else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return css.length;
}

/** Splits a rule body into declarations, dropping nested blocks. */
function splitDeclarations(body: string): [string, string][] {
  const out: [string, string][] = [];
  let paren = 0;
  let brace = 0;
  let start = 0;
  const push = (end: number) => {
    if (end - start > MAX_VALUE + 200) return;
    const piece = body.slice(start, end);
    const colon = piece.indexOf(":");
    if (colon > 0 && colon <= 100 && piece.length - colon <= MAX_VALUE + 1) {
      const name = piece.slice(0, colon).trim().toLowerCase();
      if (/^-?-?[a-z][\w-]*$/.test(name) || name.startsWith("--"))
        out.push([name.startsWith("--") ? piece.slice(0, colon).trim() : name, stripImportant(piece.slice(colon + 1).trim())]);
    }
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") i++;
    else if (c === '"' || c === "'") {
      for (i++; i < body.length && body[i] !== c; i++) if (body[i] === "\\") i++;
    } else if (c === "(") paren++;
    else if (c === ")") paren = Math.max(0, paren - 1);
    else if (c === "{") brace++;
    else if (c === "}") {
      brace = Math.max(0, brace - 1);
      if (brace === 0) start = i + 1;
    } else if (c === ";" && paren === 0 && brace === 0) {
      push(i);
      start = i + 1;
    }
  }
  if (brace === 0) push(body.length);
  return out;
}

type Rule = { selectors: string; body: string; dark: boolean };

const MAX_RULES = 20_000;
const MAX_SELECTOR = 1024; // longer preludes are skipped
const MAX_SELECTOR_PARTS = 32;

/** Fills `out` with style rules; returns false when the MAX_RULES cap cut the scan short. */
function collectRules(css: string, dark: boolean, out: Rule[], depth = 0): boolean {
  if (depth > 6) return true;
  let paren = 0;
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "\\") i++;
    else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "(") paren++;
    else if (c === ")") paren = Math.max(0, paren - 1);
    else if (paren === 0 && c === ";") start = i + 1;
    else if (paren === 0 && c === "}") start = i + 1;
    else if (paren === 0 && c === "{") {
      if (out.length >= MAX_RULES) return false;
      const end = closingBrace(css, i);
      const prelude = i - start > MAX_SELECTOR * 4 ? "" : css.slice(start, i).trim();
      if (prelude.startsWith("@")) {
        const name = prelude.match(/^@([\w-]+)/)?.[1].toLowerCase();
        if (name && ["media", "supports", "layer", "container", "scope", "document"].includes(name)) {
          const nested = collectRules(
            css.slice(i + 1, end),
            dark || (name === "media" && prelude.length <= MAX_SELECTOR && /prefers-color-scheme\s*:\s*dark/i.test(prelude)),
            out,
            depth + 1,
          );
          if (!nested) return false;
        }
      } else if (prelude && prelude.length <= MAX_SELECTOR) out.push({ selectors: prelude, body: css.slice(i + 1, end), dark });
      i = end;
      start = end + 1;
    }
  }
  return true;
}

const DARK_CLASS = /\.(?:dark|theme-dark|dark-mode)\b/gi;
const LIGHT_CLASS = /\.(?:light|theme-light|light-mode)\b/gi;
const THEME_ATTR = /\[data-[a-z-]*(?:theme|mode)(?:\s*=\s*["']?([\w-]+)["']?)?\s*\]/gi;
const ROOT_PARTS = new Set(["", ":root", "html", "body", ":host"]);

type SelectorInfo = { dark: boolean; root: boolean; tag: "html" | "body" | "root" | "other" };

/** Splits a selector list on top-level commas (not inside parentheses or brackets). */
function splitSelectors(selectors: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selectors.length && parts.length < MAX_SELECTOR_PARTS; i++) {
    const c = selectors[i];
    if (c === "\\") i++;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      parts.push(selectors.slice(start, i));
      start = i + 1;
    }
  }
  if (parts.length < MAX_SELECTOR_PARTS) parts.push(selectors.slice(start));
  return parts;
}

const infoCache = new Map<string, SelectorInfo[]>();
function selectorInfos(selectors: string): SelectorInfo[] {
  let infos = infoCache.get(selectors);
  if (!infos) {
    infos = splitSelectors(selectors).map(classifySelector);
    if (infoCache.size >= 2000) infoCache.clear();
    infoCache.set(selectors, infos);
  }
  return infos;
}

/** Only plain light/dark/auto theme switches count; named variants (dark_dimmed, high contrast) are ignored. */
function classifySelector(selector: string): SelectorInfo {
  let dark = new RegExp(DARK_CLASS.source, "i").test(selector);
  let variant = false;
  const stripped = selector
    .replace(THEME_ATTR, (_, value?: string) => {
      const v = (value ?? "").toLowerCase();
      if (v === "dark") dark = true;
      else if (v && v !== "light" && v !== "auto") variant = true;
      return "";
    })
    .replace(DARK_CLASS, "")
    .replace(LIGHT_CLASS, "")
    .replace(/::backdrop/gi, "")
    .trim()
    .toLowerCase();
  const parts = stripped.split(/[\s>+~]+/);
  const root = !variant && parts.every((p) => ROOT_PARTS.has(p));
  const last = parts[parts.length - 1];
  return { dark, root, tag: !root ? "other" : last === "body" ? "body" : last === "html" ? "html" : "root" };
}

/* ---------- Variable naming ---------- */

const words = (name: string) =>
  name
    .replace(/^--/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
const has = (w: string[], list: string[]) => list.some((x) => w.includes(x));
const SKIP_WORDS = ["hover", "active", "focus", "disabled", "selected", "inverse", "inverted", "overlay", "on", "contrast", "pressed", "visited", "danger", "error", "success", "warning", "info", "attention", "severe", "destructive", "ring", "shadow", "chart", "sidebar"];
const SOFT = ["muted", "subtle", "soft", "tint", "wash", "light", "faint"];
const ACCENT_WORDS = ["link", "brand", "accent", "primary", "highlight", "cta"];
const BG_WORDS = ["bg", "background", "surface", "canvas", "paper", "page"];
const TEXT_WORDS = ["fg", "foreground", "text", "ink", "content", "body", "copy"];
const LINE_WORDS = ["border", "line", "divider", "separator", "rule", "stroke", "outline"];
const CANONICAL = new Set([
  "bg", "background", "surface", "canvas", "paper", "page",
  "fg", "foreground", "text", "ink", "content",
  "primary", "accent", "brand", "link",
  "border", "line", "divider",
  "muted-foreground", "fg-muted", "text-muted", "foreground-muted", "text-secondary", "muted",
  "accent-soft", "accent-subtle", "primary-soft", "brand-soft",
]);

function classifyVar(name: string): { role: ColorRole; rank: number } | null {
  const w = words(name);
  if (!w.length || has(w, SKIP_WORDS)) return null;
  const meaningful = w.filter((x) => !["color", "clr", "default", "base", "theme"].includes(x));
  const canonical = meaningful.join("-");
  // Long names are usually scoped to a component or third-party widget (--docsearch-modal-background).
  if (!CANONICAL.has(canonical) && meaningful.length > 2) return null;
  const rank = CANONICAL.has(canonical) ? 0 : Math.max(1, meaningful.length);
  const soft = has(w, SOFT);
  if (has(w, LINE_WORDS)) return has(w, ACCENT_WORDS) ? null : { role: "line", rank };
  if (has(w, ACCENT_WORDS)) {
    const strong = has(w, ["link", "brand", "accent", "highlight", "cta"]);
    if (!strong && has(w, TEXT_WORDS)) return soft ? { role: "muted", rank } : { role: "foreground", rank };
    if (!strong && has(w, BG_WORDS)) return soft ? null : { role: "background", rank };
    return soft ? { role: "accentSoft", rank } : { role: "accent", rank };
  }
  if (has(w, BG_WORDS))
    return soft || has(w, ["secondary", "tertiary", "inset", "emphasis", "alt", "card", "raised", "sunken", "popover"]) ? null : { role: "background", rank };
  if (has(w, TEXT_WORDS))
    return soft || has(w, ["secondary", "tertiary", "dim", "placeholder", "caption"])
      ? { role: "muted", rank }
      : { role: "foreground", rank };
  if (has(w, ["muted", "subtle", "dim", "faint"])) return { role: "muted", rank: Math.max(1, rank) };
  return null;
}

/* ---------- Fonts and radii ---------- */

const GENERIC_FONTS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace",
  "ui-rounded", "-apple-system", "blinkmacsystemfont", "emoji", "math", "inherit", "initial", "unset", "revert",
]);

function firstFamily(value: string): string | null {
  const raw = value.split(",")[0]?.trim().replace(/^["']|["']$/g, "").trim();
  if (!raw || raw.includes("var(") || /^[\d.-]/.test(raw) && raw !== "-apple-system" || GENERIC_FONTS.has(raw.toLowerCase())) return null;
  const hashed = raw.match(/^__(.+?)_[0-9a-f]{6,}$/i);
  const name = (hashed ? hashed[1].replace(/_/g, " ") : raw).replace(/\s+(variable|var|vf)$/i, "").trim();
  return name && !/fallback/i.test(name) ? name : null;
}

function fontRole(family: string, selector: string, varName?: string): FontRole {
  const w = varName ? words(varName) : [];
  if (/mono|code|consol|courier/i.test(family) || has(w, ["mono", "code"]) || /\b(?:code|pre|kbd|samp)\b/i.test(selector)) return "mono";
  if (has(w, ["display", "heading", "title", "headline"]) || /(?:^|[\s,])h[1-3]\b|\.(?:title|heading|display|hero)/i.test(selector)) return "display";
  if (has(w, ["sans", "body", "base", "text", "primary", "ui"]) || classifySelector(selector).root) return "body";
  return "other";
}

function toPx(token: string): number | null {
  const m = token.trim().match(/^(-?[\d.]+)(px|rem|em)?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n < 0) return null;
  return m[2] && m[2].toLowerCase() !== "px" ? n * 16 : n;
}

/* ---------- Extraction ---------- */

const COLOR_PROPS = new Set([
  "color", "background", "background-color", "border", "border-color", "border-top", "border-right", "border-bottom",
  "border-left", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline",
  "outline-color", "fill", "stroke", "text-decoration-color", "caret-color", "accent-color",
]);

const bump = (map: Record<string, number>, key: string, by = 1) => {
  map[key] = (map[key] ?? 0) + by;
};

/** Splits `light-dark(a, b)` into its two sides (or returns the value for both). */
function lightDark(value: string): [string, string] {
  const open = /light-dark\(/i.exec(value);
  if (!open) return [value, value];
  const argsStart = open.index + open[0].length;
  let depth = 0;
  let comma = -1;
  for (let i = argsStart; i < value.length; i++) {
    const c = value[i];
    if (c === "(") depth++;
    else if (c === ")") {
      if (depth === 0) {
        if (comma < 0) return [value, value];
        const before = value.slice(0, open.index);
        const after = value.slice(i + 1);
        return [before + value.slice(argsStart, comma).trim() + after, before + value.slice(comma + 1, i).trim() + after];
      }
      depth--;
    } else if (c === "," && depth === 0 && comma < 0) comma = i;
  }
  return [value, value];
}

const EXTRACTION_BUDGET_MS = 1500;
const MAX_INLINE_STYLES = 500;
const MAX_VARS = 10_000;
const VALID_HEX = /^#[0-9a-f]{6}$/;

export function extractDesign(html: string, css: string): Extraction {
  const deadline = Date.now() + EXTRACTION_BUDGET_MS;
  let stopped = false;
  let capped = false; // a size cap (rules, variables) cut the input short
  /** True once the time budget is spent; every long loop below checks it. */
  const late = () => stopped || (stopped = Date.now() > deadline);

  const rules: Rule[] = [];
  if (!collectRules(stripComments(css), false, rules)) capped = true;
  // Inline style="" attributes behave like rules on their own element.
  const inline: string[] = [];
  const styleAttr = /\sstyle\s*=\s*"([^"]{1,2000})"/gi;
  for (let m = styleAttr.exec(html); m && inline.length < MAX_INLINE_STYLES; m = styleAttr.exec(html))
    inline.push(m[1].replace(/&quot;/g, '"'));

  const lightVars = new Map<string, string>();
  const darkOnly = new Map<string, string>();
  for (const rule of rules) {
    if (late()) break;
    const infos = selectorInfos(rule.selectors);
    for (const [name, value] of splitDeclarations(rule.body)) {
      if (!name.startsWith("--")) continue;
      if (lightVars.size + darkOnly.size >= MAX_VARS) {
        capped = true;
        break;
      }
      if (late()) break;
      for (const info of infos) {
        if (!info.root) continue;
        const [l, d] = lightDark(value);
        if (/light-dark\(/i.test(value)) {
          lightVars.set(name, l);
          darkOnly.set(name, d);
        } else (rule.dark || info.dark ? darkOnly : lightVars).set(name, value);
      }
    }
  }
  const darkVars = new Map([...lightVars, ...darkOnly]);

  const resolveLight = makeResolver(lightVars, late);
  const resolveDark = makeResolver(darkVars, late);
  const resolvedLight: Record<string, string> = {};
  for (const [name, value] of lightVars) resolvedLight[name] = resolveLight(value);
  const resolvedDark: Record<string, string> = {};
  for (const [name, value] of darkOnly) resolvedDark[name] = resolveDark(value);

  const candidates = { light: emptyCandidates(), dark: emptyCandidates() };
  const addVarCandidates = (theme: "light" | "dark", source: Record<string, string>) => {
    for (const [name, value] of Object.entries(source)) {
      if (late()) break;
      const role = classifyVar(name);
      const hex = role && singleColor(value);
      if (role && hex) candidates[theme][role.role].push({ hex, rank: role.rank, source: "var" });
    }
  };
  addVarCandidates("light", resolvedLight);
  addVarCandidates("dark", resolvedDark);

  const counts = { light: {} as Record<string, number>, dark: {} as Record<string, number> };
  const fonts: Extraction["fonts"] = { display: {}, body: {}, mono: {}, other: {} };
  const radii: number[] = [];
  let unsupported = 0;
  const ruleBg: Record<"light" | "dark", Partial<Record<"body" | "html" | "root", string>>> = { light: {}, dark: {} };
  const ruleFg: typeof ruleBg = { light: {}, dark: {} };

  const handle = (selectors: string, declarations: [string, string][], ruleDark: boolean) => {
    const infos = selectorInfos(selectors);
    const allDark = ruleDark || infos.every((i) => i.dark);
    for (const [name, rawValue] of declarations) {
      if (late()) return;
      if (name.startsWith("--")) {
        if (/radius/i.test(name)) {
          const px = toPx((allDark ? resolveDark : resolveLight)(rawValue));
          if (px !== null && px < 100) radii.push(px, px, px);
        }
        continue;
      }
      const [l, d] = lightDark(rawValue);
      const variants: ["light" | "dark", string][] =
        l !== d ? [["light", l], ["dark", d]] : [[allDark ? "dark" : "light", rawValue]];
      for (const [theme, raw] of variants) {
        const value = (theme === "dark" ? resolveDark : resolveLight)(raw);
        if (COLOR_PROPS.has(name)) {
          const found = colorsIn(value);
          if (found.unsupported) unsupported++;
          for (const hex of found.colors) bump(counts[theme], hex);
          const hex = found.colors[0];
          if (hex && (name === "color" || name === "background" || name === "background-color"))
            for (const info of infos)
              if (info.root && info.tag !== "other") {
                const t = info.dark ? "dark" : theme;
                (name === "color" ? ruleFg : ruleBg)[t][info.tag] = hex;
              }
        } else if (name === "font-family") {
          const family = firstFamily(value);
          if (family) bump(fonts[fontRole(family, selectors)], family, infos.some((i) => i.root) ? 3 : 1);
        } else if (name === "border-radius") {
          const px = toPx(value.split(/[\s/]+/)[0]);
          if (px !== null && px < 100) radii.push(px);
        }
      }
    }
  };

  for (const rule of rules) {
    if (late()) break;
    handle(rule.selectors, splitDeclarations(rule.body), rule.dark);
  }
  for (const style of inline) {
    if (late()) break;
    handle("*", splitDeclarations(style), false);
  }

  // Font custom properties carry a role in their name.
  for (const [name, value] of Object.entries({ ...resolvedLight, ...resolvedDark })) {
    if (late()) break;
    if (!/font|family/i.test(name) || !/family|sans|serif|mono|display|heading|body|text|stack|code/i.test(name)) continue;
    if (/size|weight|style|height|feature|spacing|tracking|line|variation/i.test(name)) continue;
    const family = firstFamily(value);
    if (family) bump(fonts[fontRole(family, "", name)], family, 2);
  }

  for (const theme of ["light", "dark"] as const) {
    const pick = (record: typeof ruleBg.light) => record.body ?? record.html ?? record.root;
    const bg = pick(ruleBg[theme]);
    const fg = pick(ruleFg[theme]);
    if (bg) candidates[theme].background.unshift({ hex: bg, rank: -1, source: "rule" });
    if (fg) candidates[theme].foreground.unshift({ hex: fg, rank: -1, source: "rule" });
  }

  const merged: Record<string, number> = {};
  for (const side of [counts.light, counts.dark]) for (const [hex, n] of Object.entries(side)) bump(merged, hex, n);
  return {
    variables: resolvedLight,
    darkVariables: resolvedDark,
    colors: Object.entries(merged)
      .filter(([hex]) => VALID_HEX.test(hex))
      .map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count),
    counts,
    candidates,
    fonts,
    radii,
    unsupported,
    stopped: stopped || capped,
  };
}

/* ---------- Suggestions ---------- */

const bestOf = (list: Candidate[]) => [...list].sort((a, b) => a.rank - b.rank)[0]?.hex;
const isAccentLike = (hex: string) => {
  const { s, l } = hexToHsl(hex);
  return s > 35 && l > 20 && l < 80;
};
const catalogMatch = (family: string) => fontCatalog.find((f) => f.name.toLowerCase() === family.toLowerCase())?.name;
const topOf = (record: Record<string, number>) => Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0];

export function suggestTokens(extraction: Extraction): Suggestion {
  const tokens: Partial<Tokens> = {};
  const notes: string[] = [];
  let evidence = 0;

  const accentFor = (theme: "light" | "dark"): string | undefined => {
    // A canonical var (--primary, --accent) wins, then real usage, then any other accent-named var.
    const named = [...extraction.candidates[theme].accent].sort((a, b) => a.rank - b.rank).filter((c) => isAccentLike(c.hex));
    if (named[0]?.rank === 0) return named[0].hex;
    const used = Object.entries(extraction.counts[theme])
      .filter(([hex]) => isAccentLike(hex))
      .sort((a, b) => b[1] - a[1])[0];
    return used?.[0] ?? named[0]?.hex;
  };

  const light = extraction.candidates.light;
  const dark = extraction.candidates.dark;
  const set = (key: keyof Tokens, hex: string | undefined) => {
    if (!hex || !VALID_HEX.test(hex)) return false;
    (tokens as Record<string, unknown>)[key] = hex;
    return true;
  };

  set("paper", bestOf(light.background));
  set("ink", bestOf(light.foreground));
  set("muted", bestOf(light.muted));
  set("line", bestOf(light.line));
  const accent = accentFor("light");
  if (set("accent", accent)) evidence++;
  else if (light.accent.length) notes.push("The accent colors this site names are close to neutral, so no accent was suggested.");
  set("accentSoft", bestOf(light.accentSoft));

  const darkPaper = bestOf(dark.background);
  const darkInk = bestOf(dark.foreground);
  const hasDark = Boolean(darkPaper || darkInk);
  if (hasDark) {
    set("darkPaper", darkPaper);
    set("darkInk", darkInk);
    set("darkMuted", bestOf(dark.muted));
    set("darkLine", bestOf(dark.line));
    // Accents usually carry over unchanged, but surfaces never do.
    if (set("darkAccent", accentFor("dark") ?? accent)) evidence++;
    set("darkAccentSoft", bestOf(dark.accentSoft));
  } else if (extraction.colors.length) {
    notes.push("No dark theme found, so dark colors were left alone.");
  }

  // Type
  const roles = ["display", "body", "mono"] as const;
  let matchedFonts = 0;
  const bodyFamilies = topOf(extraction.fonts.body) ? extraction.fonts.body : extraction.fonts.other;
  for (const role of roles) {
    const record = role === "body" ? bodyFamilies : extraction.fonts[role];
    const family = topOf(record);
    if (!family) continue;
    const match = catalogMatch(family);
    if (match) {
      tokens[`${role}Font` as const] = match;
      matchedFonts++;
    } else notes.push(`${role[0].toUpperCase()}${role.slice(1)} font "${family}" is not in CHROMIQ's font catalog, so it was left alone.`);
  }

  // Shape
  if (extraction.radii.length) {
    const sorted = [...extraction.radii].sort((a, b) => a - b);
    const median = sorted[Math.floor((sorted.length - 1) / 2)];
    tokens.radius = Math.max(0, Math.min(32, Math.round(median)));
  }

  if (extraction.stopped)
    notes.push("Stopped reading styles early because this site's CSS is very large, so these suggestions may be incomplete.");

  if (extraction.unsupported)
    notes.push(
      `${extraction.unsupported} color declaration${extraction.unsupported === 1 ? "" : "s"} use lab(), lch(), color() or color-mix(), which CHROMIQ cannot read yet.`,
    );

  // Contrast checks on what was actually suggested.
  const check = (label: string, fg: string | undefined, bg: string | undefined, min: number) => {
    if (fg && bg && contrastRatio(fg, bg) < min) notes.push(`${label} is ${contrastRatio(fg, bg)}:1, below ${min}:1.`);
  };
  check("Light text on background", tokens.ink, tokens.paper, 4.5);
  check("Light muted text on background", tokens.muted, tokens.paper, 3);
  check("Light accent on background", tokens.accent, tokens.paper, 3);
  check("Dark text on background", tokens.darkInk, tokens.darkPaper, 4.5);
  check("Dark muted text on background", tokens.darkMuted, tokens.darkPaper, 3);
  check("Dark accent on background", tokens.darkAccent, tokens.darkPaper, 3);

  const coreColors = [tokens.paper, tokens.ink, tokens.accent].filter(Boolean).length;
  const colorCount = Object.keys(tokens).filter((k) => !/Font$|^radius$/.test(k)).length;
  const colorConfidence = coreColors === 3 && evidence > 0 ? "high" : colorCount >= 2 ? "medium" : "low";
  const typeConfidence = matchedFonts >= 2 ? "high" : matchedFonts === 1 ? "medium" : "low";
  const shapeConfidence = extraction.radii.length >= 5 ? "high" : extraction.radii.length >= 2 ? "medium" : "low";

  if (!colorCount) notes.push("No readable colors were found, so no color tokens were suggested.");
  return { tokens, confidence: { color: colorConfidence, type: typeConfidence, shape: shapeConfidence }, notes };
}
