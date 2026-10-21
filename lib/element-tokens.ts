import { onAccent, themeColors, themeTokenKeys } from "@/lib/theme";
import type { Mode, ThemeRole, Tokens } from "@/types/workspace";

export type ColorRole = ThemeRole | "onAccent" | "success" | "warning" | "danger";

/** One design token an element appears to use, inferred from its computed styles. */
export type ElementTokenMatch =
  | {
      kind: "color";
      property: "background" | "text" | "border";
      role: ColorRole;
      /** null for derived colors (onAccent), which are not editable on their own. */
      token: keyof Tokens | null;
      value: string;
      inherited?: boolean;
    }
  | { kind: "radius"; value: number }
  | {
      kind: "font";
      role: "display" | "body" | "mono";
      token: "displayFont" | "bodyFont" | "monoFont";
      value: string;
      inherited?: boolean;
    }
  | { kind: "spacing"; value: number }
  | {
      kind: "type";
      fontSizePx: number;
      lineHeight: number | null;
      tracking: number | null;
    };

/** CSS custom property names used by the exports, per color role. */
export const colorRoleVars: Record<ColorRole, string> = {
  background: "--prism-bg",
  foreground: "--prism-fg",
  muted: "--prism-muted",
  line: "--prism-line",
  accent: "--prism-accent",
  accentSoft: "--prism-accent-soft",
  onAccent: "--prism-on-accent",
  success: "--prism-success",
  warning: "--prism-warning",
  danger: "--prism-danger",
};

const MAX_COLOR_DISTANCE = 6;
const colorPriority: ColorRole[] = [
  "background",
  "foreground",
  "muted",
  "line",
  "accent",
  "accentSoft",
  "success",
  "warning",
  "danger",
];

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) =>
      Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, "0"),
    )
    .join("")}`;

/** rgb()/rgba()/color(srgb …) to #rrggbb. Returns null when unparseable or fully transparent. */
export function cssColorToHex(input: string): string | null {
  const text = input.trim().toLowerCase();
  const rgb = text.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const alpha = parts[3] === undefined ? 1 : parseFloat(parts[3]);
    if (alpha === 0 || Number.isNaN(alpha)) return null;
    const [r, g, b] = parts.slice(0, 3).map(parseFloat);
    return [r, g, b].some(Number.isNaN) ? null : toHex(r, g, b);
  }
  const srgb = text.match(/^color\(srgb\s+([^)]+)\)$/);
  if (srgb) {
    const [channels, alphaText] = srgb[1].split("/");
    const [r, g, b] = channels.trim().split(/\s+/).map(parseFloat);
    const alpha = alphaText === undefined ? 1 : parseFloat(alphaText);
    if (alpha === 0 || [r, g, b, alpha].some(Number.isNaN)) return null;
    return toHex(r * 255, g * 255, b * 255);
  }
  return null;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function distance(a: string, b: string) {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

type ColorCandidate = { role: ColorRole; token: keyof Tokens | null; value: string };

function colorCandidates(tokens: Tokens, mode: Mode): ColorCandidate[] {
  const colors = themeColors(tokens, mode);
  const keys = themeTokenKeys[mode];
  return [
    ...(["background", "foreground", "muted", "line", "accent", "accentSoft"] as const).map(
      (role) => ({ role, token: keys[role], value: colors[role] }),
    ),
    { role: "onAccent" as const, token: null, value: onAccent(colors) },
    { role: "success" as const, token: "success" as const, value: tokens.success },
    { role: "warning" as const, token: "warning" as const, value: tokens.warning },
    { role: "danger" as const, token: "danger" as const, value: tokens.danger },
  ];
}

/** The current value of a color role in the given theme. */
export function tokenColor(role: ColorRole, tokens: Tokens, mode: Mode) {
  return colorCandidates(tokens, mode).find((candidate) => candidate.role === role)?.value ?? "#000000";
}

function matchColor(
  css: string,
  candidates: ColorCandidate[],
  prefer?: ColorRole,
): ColorCandidate | null {
  const hex = cssColorToHex(css);
  if (!hex) return null;
  const pool = candidates.filter((candidate) => candidate.role !== "onAccent" || prefer === "onAccent");
  const ordered = [...pool].sort(
    (a, b) =>
      (a.role === prefer ? -1 : 0) - (b.role === prefer ? -1 : 0) ||
      colorPriority.indexOf(a.role) - colorPriority.indexOf(b.role),
  );
  const exact = ordered.find((candidate) => candidate.value.toLowerCase() === hex);
  if (exact) return exact;
  let best: ColorCandidate | null = null;
  let bestDistance = MAX_COLOR_DISTANCE + 1;
  for (const candidate of ordered) {
    const gap = distance(candidate.value, hex);
    if (gap <= MAX_COLOR_DISTANCE && gap < bestDistance) {
      best = candidate;
      bestDistance = gap;
    }
  }
  return best;
}

const firstFamily = (family: string) =>
  (family.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "").toLowerCase();

function matchFont(fontFamily: string, tokens: Tokens): ElementTokenMatch | null {
  const first = firstFamily(fontFamily);
  const fonts = [
    { role: "display", token: "displayFont" },
    { role: "body", token: "bodyFont" },
    { role: "mono", token: "monoFont" },
  ] as const;
  const hit = fonts.find(({ token }) => tokens[token].toLowerCase() === first);
  return hit ? { kind: "font", role: hit.role, token: hit.token, value: tokens[hit.token] } : null;
}

const px = (value: string) => parseFloat(value) || 0;

function hasOwnText(el: HTMLElement) {
  return Array.from(el.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
  );
}

function textColorMatch(
  color: string,
  candidates: ColorCandidate[],
  background: ColorCandidate | null,
): ElementTokenMatch | null {
  const hit = matchColor(color, candidates, background?.role === "accent" ? "onAccent" : undefined);
  return hit ? { kind: "color", property: "text", ...hit } : null;
}

/**
 * Run `read` against an unhovered, untransitioned twin of the element, so the rest-state styles are
 * measured rather than a hover color or a half-finished transition. The twin lives for one task.
 */
function atRest<T>(el: HTMLElement, read: (style: CSSStyleDeclaration) => T): T {
  const twin = el.cloneNode(false) as HTMLElement;
  for (const name of ["id", "data-select-hover", "data-select-active"]) twin.removeAttribute(name);
  twin.setAttribute("aria-hidden", "true");
  el.after(twin);
  try {
    return read(getComputedStyle(twin));
  } finally {
    twin.remove();
  }
}

/**
 * Infer which PRISM tokens an element uses by reading its computed styles.
 * This is a best-effort inference: colors match exactly first, then within a small RGB distance.
 */
export function elementTokens(el: HTMLElement, tokens: Tokens, mode: Mode): ElementTokenMatch[] {
  return atRest(el, (style) => matchStyle(el, style, tokens, mode));
}

function matchStyle(
  el: HTMLElement,
  style: CSSStyleDeclaration,
  tokens: Tokens,
  mode: Mode,
): ElementTokenMatch[] {
  const candidates = colorCandidates(tokens, mode);
  const matches: ElementTokenMatch[] = [];

  const background = matchColor(style.backgroundColor, candidates);
  if (background) matches.push({ kind: "color", property: "background", ...background });

  const ownText = hasOwnText(el);
  if (ownText) {
    const text = textColorMatch(style.color, candidates, background);
    if (text) matches.push(text);
  }

  const borderWidth = px(style.borderTopWidth);
  if (borderWidth > 0 && style.borderTopStyle !== "none") {
    const border = matchColor(style.borderTopColor, candidates);
    if (border) matches.push({ kind: "color", property: "border", ...border });
  }

  const radius = px(style.borderTopLeftRadius);
  const visibleBox = background !== null || borderWidth > 0;
  // Small controls use a fixed fraction of the radius token (0.6x in the preview surfaces).
  const onRadius = [1, 0.6].some((factor) => Math.abs(radius - tokens.radius * factor) < 0.01);
  if (onRadius && (radius > 0 || visibleBox)) {
    matches.push({ kind: "radius", value: tokens.radius });
  }

  if (ownText) {
    const font = matchFont(style.fontFamily, tokens);
    if (font) matches.push(font);
  }

  const step = tokens.spacing;
  const onGrid = [style.paddingTop, style.paddingLeft, style.rowGap, style.columnGap].some(
    (side) => {
      const value = px(side);
      if (value <= 0 || step <= 0) return false;
      const ratio = value / step;
      return Math.round(ratio) >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.02;
    },
  );
  if (onGrid) matches.push({ kind: "spacing", value: step });

  if (ownText) {
    const fontSizePx = px(style.fontSize);
    const lineHeightPx = style.lineHeight === "normal" ? null : px(style.lineHeight);
    const trackingPx = style.letterSpacing === "normal" ? null : px(style.letterSpacing);
    matches.push({
      kind: "type",
      fontSizePx,
      lineHeight: lineHeightPx && fontSizePx ? lineHeightPx / fontSizePx : null,
      tracking: trackingPx !== null && fontSizePx ? trackingPx / fontSizePx : null,
    });
  }

  const direct = matches.filter((match) => match.kind !== "type");
  if (direct.length > 0) return matches;

  // Nothing matched directly: report the text color and font this element inherits.
  const inherited: ElementTokenMatch[] = [];
  for (let node: HTMLElement | null = el; node && inherited.length === 0; node = node.parentElement) {
    const computed = node === el ? style : getComputedStyle(node);
    const text = textColorMatch(computed.color, candidates, null);
    if (text && text.kind === "color") inherited.push({ ...text, inherited: true });
    const font = matchFont(computed.fontFamily, tokens);
    if (font && font.kind === "font") inherited.push({ ...font, inherited: true });
    if (node.classList.contains("design-preview")) break;
  }
  return [...matches, ...inherited];
}

/** Short description such as "button · btn-primary" (tag plus first class, `sf-` prefix removed). */
export function describeElement(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  const cls = Array.from(el.classList)
    .map((name) => name.replace(/^sf-/, ""))
    .find((name) => name && name !== "edit");
  return cls ? `${tag} · ${cls}` : tag;
}
