import { fontCatalog } from "@/data/workspace";

export type RestyleState = {
  /** Percent, 50-200. */
  textScale: number;
  /** Percent, 50-200, multiplies textScale for h1-h6. */
  headingScale: number;
  /** "" keeps the page's original font. */
  headingFont: string;
  bodyFont: string;
  /** 0 keeps the original weight. */
  headingWeight: number;
  bodyWeight: number;
  /** 0 keeps the original line height. */
  lineHeight: number;
  /** em, -0.05 to 0.15. */
  letterSpacing: number;
  /** Original hex (lowercase) -> replacement hex. */
  colors: Record<string, string>;
  /** "" disables the accent override. */
  accent: string;
  /** px, -1 disables the radius override. */
  radius: number;
};

export const initialRestyleState: RestyleState = {
  textScale: 100,
  headingScale: 100,
  headingFont: "",
  bodyFont: "",
  headingWeight: 0,
  bodyWeight: 0,
  lineHeight: 0,
  letterSpacing: 0,
  colors: {},
  accent: "",
  radius: -1,
};

export type PaletteEntry = { hex: string; weight: number; uses: string[] };

type Rgba = { r: number; g: number; b: number; a: number };
type Role = "h" | "b" | "m";
type Kind = "btn" | "link" | "field" | "";
type Info = {
  el: HTMLElement;
  tag: string;
  textual: boolean;
  size: number;
  role: Role;
  skipFont: boolean;
  strong: boolean;
  kind: Kind;
  color: Rgba | null;
  bg: Rgba | null;
  borders: (Rgba | null)[];
  syntheticBg?: boolean;
};

const MAX_ELEMENTS = 5000;
const STYLE_ID = "prism-restyle";
const FONT_LINK_PREFIX = "prism-restyle-font-";
const ICON_FONT = /icon|awesome|glyph|symbol|material|dashicons|emoji|ionicons|feather|fontello|eicons/i;
const SIDES = ["top", "right", "bottom", "left"] as const;
const EXPORT_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "a", "button", "small"];

export const restyleFontNames = fontCatalog.map((font) => font.name);

const WEIGHT_OVERRIDES: Record<string, string> = {
  Lato: "400;700",
  "Space Mono": "400;700",
};

export function fontStylesheetUrl(family: string) {
  const weights = WEIGHT_OVERRIDES[family] ?? "300;400;500;600;700";
  return `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, "+")}:wght@${weights}&display=swap`;
}

function fontStack(family: string) {
  const entry = fontCatalog.find((font) => font.name === family);
  const generic =
    entry?.category === "mono"
      ? "monospace"
      : family === "Playfair Display" || family === "Fraunces"
        ? "serif"
        : "sans-serif";
  return `"${family}", ${generic}`;
}

function parseColor(value: string): Rgba | null {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/,
  );
  if (!match) return null;
  let a = match[4] === undefined ? 1 : Number(match[4]);
  if (match[5] === "%") a /= 100;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a };
}

function toHex({ r, g, b }: Rgba) {
  return (
    "#" +
    [r, g, b]
      .map((channel) =>
        Math.round(Math.min(255, Math.max(0, channel)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function readableInk(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? "#1a1c19" : "#ffffff";
}

function withAlpha(hex: string, alpha: number) {
  if (alpha >= 1) return hex;
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function createRestyleEngine(doc: Document) {
  const win = doc.defaultView;
  if (!win || !doc.body) return null;
  const infos: Info[] = [];
  const touched = new Map<HTMLElement, Map<string, [string, string]>>();
  const roleAttrs = ["data-prism-role", "data-prism-kind", "data-prism-strong"];

  const snapshot = () => {
    const nodes = [doc.documentElement, ...Array.from(doc.body.querySelectorAll("*"))].slice(
      0,
      MAX_ELEMENTS,
    );
    for (const node of nodes) {
      if (!(node instanceof win.HTMLElement)) continue;
      const tag = node.tagName.toLowerCase();
      if (["script", "style", "link", "meta", "title", "head", "base"].includes(tag)) continue;
      const cs = win.getComputedStyle(node);
      if (cs.display === "none") continue;
      const ownText = Array.from(node.childNodes)
        .filter((child) => child.nodeType === 3)
        .map((child) => child.textContent ?? "")
        .join("")
        .trim();
      const field = ["input", "button", "textarea", "select"].includes(tag);
      const textual = tag !== "html" && (ownText.length > 0 || field);
      const className = typeof node.className === "string" ? node.className : "";
      const role: Role = node.closest("h1,h2,h3,h4,h5,h6")
        ? "h"
        : node.closest("code,pre,kbd,samp,tt")
          ? "m"
          : "b";
      const type = (node.getAttribute("type") || "").toLowerCase();
      const kind: Kind =
        tag === "button" ||
        (tag === "input" && ["button", "submit", "reset"].includes(type)) ||
        node.getAttribute("role") === "button" ||
        /(^|[\s_-])(btn|button)([\s_-]|$)/i.test(className)
          ? "btn"
          : tag === "a"
            ? "link"
            : field
              ? "field"
              : "";
      const color = textual ? parseColor(cs.color) : null;
      const bgRaw = parseColor(cs.backgroundColor);
      const bg = bgRaw && bgRaw.a > 0.05 ? bgRaw : null;
      const borders = SIDES.map((side) => {
        const width = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        const style = cs.getPropertyValue(`border-${side}-style`);
        return width > 0 && style !== "none" && style !== "hidden"
          ? parseColor(cs.getPropertyValue(`border-${side}-color`))
          : null;
      });
      infos.push({
        el: node,
        tag,
        textual,
        size: parseFloat(cs.fontSize) || 16,
        role,
        skipFont: ICON_FONT.test(cs.fontFamily.split(",")[0]) || ICON_FONT.test(className),
        strong: (parseInt(cs.fontWeight, 10) || 400) >= 600,
        kind,
        color,
        bg,
        borders,
      });
    }
    const hasPageBg = infos.some(
      (info) => (info.tag === "html" || info.tag === "body") && info.bg && info.bg.a > 0.9,
    );
    if (!hasPageBg) {
      const body = infos.find((info) => info.tag === "body");
      if (body) {
        body.bg = { r: 255, g: 255, b: 255, a: 1 };
        body.syntheticBg = true;
      }
    }
  };

  const computePalette = () => {
    const totals = new Map<string, { weight: number; uses: Set<string> }>();
    const add = (color: Rgba | null, weight: number, use: string) => {
      if (!color) return;
      const hex = toHex(color);
      const entry = totals.get(hex) ?? { weight: 0, uses: new Set<string>() };
      entry.weight += weight;
      entry.uses.add(use);
      totals.set(hex, entry);
    };
    for (const info of infos) {
      if (info.bg) {
        const rect = info.el.getBoundingClientRect();
        const area = info.syntheticBg || info.tag === "body" ? 1_000_000 : rect.width * rect.height;
        add(info.bg, Math.min(area / 1000, 800) * info.bg.a, "background");
      }
      if (info.color)
        add(info.color, (info.el.textContent ?? "").trim().length > 0 ? Math.min(60, (info.el.textContent ?? "").trim().length / 4) : 1, "text");
      for (const border of info.borders) add(border, 0.5, "border");
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 8)
      .map(([hex, value]) => ({
        hex,
        weight: Math.round(value.weight),
        uses: [...value.uses],
      }));
  };

  const setInline = (el: HTMLElement, prop: string, value: string) => {
    let saved = touched.get(el);
    if (!saved) {
      saved = new Map();
      touched.set(el, saved);
    }
    if (!saved.has(prop))
      saved.set(prop, [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
    el.style.setProperty(prop, value, "important");
  };

  const restoreInline = () => {
    for (const [el, props] of touched) {
      for (const [prop, [value, priority]] of props) {
        if (value) el.style.setProperty(prop, value, priority);
        else el.style.removeProperty(prop);
      }
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    }
    touched.clear();
    for (const info of infos) for (const attr of roleAttrs) info.el.removeAttribute(attr);
  };

  const ensureStyle = () => {
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = STYLE_ID;
      doc.head.appendChild(style);
    }
    return style;
  };

  const syncFontLinks = (families: string[]) => {
    const wanted = new Set(families.filter(Boolean));
    doc.head.querySelectorAll(`link[id^="${FONT_LINK_PREFIX}"]`).forEach((link) => {
      if (!wanted.has(link.getAttribute("data-family") ?? "")) link.remove();
    });
    for (const family of wanted) {
      const id = FONT_LINK_PREFIX + family.replace(/\s+/g, "-").toLowerCase();
      if (doc.getElementById(id)) continue;
      const link = doc.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = fontStylesheetUrl(family);
      link.setAttribute("data-family", family);
      doc.head.appendChild(link);
    }
  };

  const css = (state: RestyleState) => {
    const rules: string[] = [];
    const heading: string[] = [];
    const body: string[] = [];
    if (state.headingFont) heading.push(`font-family:${fontStack(state.headingFont)} !important`);
    if (state.headingWeight) heading.push(`font-weight:${state.headingWeight} !important`);
    if (state.bodyFont) body.push(`font-family:${fontStack(state.bodyFont)} !important`);
    if (heading.length) rules.push(`[data-prism-role="h"]{${heading.join(";")}}`);
    if (body.length) rules.push(`[data-prism-role="b"]{${body.join(";")}}`);
    if (state.bodyWeight)
      rules.push(`[data-prism-role="b"]:not([data-prism-strong]){font-weight:${state.bodyWeight} !important}`);
    if (state.lineHeight)
      rules.push(`[data-prism-role="b"]{line-height:${state.lineHeight} !important}`);
    if (state.letterSpacing)
      rules.push(
        `[data-prism-role="h"],[data-prism-role="b"]{letter-spacing:${state.letterSpacing}em !important}`,
      );
    if (state.accent) {
      rules.push(`a[data-prism-kind="link"]{color:${state.accent} !important}`);
      rules.push(
        `[data-prism-kind="btn"]{background-color:${state.accent} !important;color:${readableInk(state.accent)} !important}`,
      );
    }
    if (state.radius >= 0)
      rules.push(
        `[data-prism-kind="btn"],[data-prism-kind="field"]{border-radius:${state.radius}px !important}`,
      );
    return rules.join("\n");
  };

  const apply = (state: RestyleState) => {
    restoreInline();
    syncFontLinks([state.headingFont, state.bodyFont]);
    ensureStyle().textContent = css(state);
    for (const info of infos) {
      const { el } = info;
      if (info.textual && !info.skipFont && info.role !== "m") {
        el.setAttribute("data-prism-role", info.role);
        if (info.role === "b" && info.strong) el.setAttribute("data-prism-strong", "1");
      }
      if (info.kind && !info.skipFont) el.setAttribute("data-prism-kind", info.kind);
      if (info.textual) {
        const multiplier =
          (state.textScale / 100) * (info.role === "h" ? state.headingScale / 100 : 1);
        if (multiplier !== 1) setInline(el, "font-size", `${round(info.size * multiplier)}px`);
      }
      const swap = (color: Rgba | null, prop: string) => {
        if (!color) return;
        const replacement = state.colors[toHex(color)];
        if (replacement) setInline(el, prop, withAlpha(replacement, color.a));
      };
      swap(info.color, "color");
      swap(info.bg, "background-color");
      info.borders.forEach((border, index) => swap(border, `border-${SIDES[index]}-color`));
    }
  };

  const sizeStats = () => {
    const stats: Record<string, number> = {};
    for (const tag of EXPORT_TAGS) {
      const sizes = infos.filter((info) => info.tag === tag && info.textual).map((info) => info.size);
      if (sizes.length) stats[tag] = median(sizes);
    }
    return stats;
  };

  const exportCss = (state: RestyleState, sourceUrl: string) => {
    const lines: string[] = [`/* PRISM restyle overrides for ${sourceUrl.replace(/[\r\n]+/g, " ").replace(/\*\//g, "*%2F")} */`];
    const families = [...new Set([state.headingFont, state.bodyFont].filter(Boolean))];
    for (const family of families) lines.push(`@import url("${fontStylesheetUrl(family)}");`);
    if (families.length) lines.push("");
    const bodySelector =
      "body, p, li, a, button, input, textarea, select, label, td, th, blockquote, figcaption";
    const headingSelector = "h1, h2, h3, h4, h5, h6";
    const bodyRule: string[] = [];
    if (state.bodyFont) bodyRule.push(`font-family: ${fontStack(state.bodyFont)};`);
    if (state.bodyWeight) bodyRule.push(`font-weight: ${state.bodyWeight};`);
    if (state.lineHeight) bodyRule.push(`line-height: ${state.lineHeight};`);
    if (state.letterSpacing) bodyRule.push(`letter-spacing: ${state.letterSpacing}em;`);
    if (bodyRule.length) lines.push(`${bodySelector} {`, ...bodyRule.map((r) => `  ${r}`), "}", "");
    const headingRule: string[] = [];
    if (state.headingFont) headingRule.push(`font-family: ${fontStack(state.headingFont)};`);
    if (state.headingWeight) headingRule.push(`font-weight: ${state.headingWeight};`);
    if (state.letterSpacing) headingRule.push(`letter-spacing: ${state.letterSpacing}em;`);
    if (headingRule.length)
      lines.push(`${headingSelector} {`, ...headingRule.map((r) => `  ${r}`), "}", "");
    if (state.textScale !== 100 || state.headingScale !== 100) {
      lines.push(
        `/* Font sizes: text ${state.textScale}%, headings ${state.headingScale}% (median size of each tag on the source page, scaled) */`,
      );
      const stats = sizeStats();
      for (const tag of EXPORT_TAGS) {
        if (!stats[tag]) continue;
        const heading = /^h[1-6]$/.test(tag);
        const px = round(stats[tag] * (state.textScale / 100) * (heading ? state.headingScale / 100 : 1));
        lines.push(`${tag} { font-size: ${px}px; }`);
      }
      lines.push("");
    }
    if (state.accent || state.radius >= 0) {
      lines.push("/* Accent and shape */");
      if (state.accent) {
        lines.push(`a { color: ${state.accent}; }`);
        lines.push(
          `button, [role="button"], input[type="submit"] { background-color: ${state.accent}; color: ${readableInk(state.accent)}; }`,
        );
      }
      if (state.radius >= 0)
        lines.push(`button, [role="button"], input, textarea, select { border-radius: ${state.radius}px; }`);
      lines.push("");
    }
    const swaps = Object.entries(state.colors).filter(([from, to]) => from !== to);
    if (swaps.length) {
      lines.push(
        "/* Color replacements. The source page uses these values in its own CSS,",
        "   so swap each original for the matching custom property. */",
        ":root {",
      );
      swaps.forEach(([from, to], index) =>
        lines.push(`  --restyle-color-${index + 1}: ${to}; /* replaces ${from} */`),
      );
      lines.push("}");
    }
    if (lines.length <= 1) lines.push("/* No changes yet. */");
    return lines.join("\n").trimEnd() + "\n";
  };

  const guardLinks = (onLink: (href: string) => void) => {
    const handler = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href], a[*|href]");
      if (!anchor) return;
      event.preventDefault();
      const raw = anchor.getAttribute("href") || anchor.getAttribute("xlink:href") || "";
      if (raw.startsWith("#")) {
        let id = raw.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          // keep the raw fragment when it is not valid percent-encoding
        }
        doc.getElementById(id)?.scrollIntoView();
        return;
      }
      const svgHref = (anchor as unknown as SVGAElement).href;
      const href =
        typeof svgHref === "object" && svgHref !== null
          ? new URL(svgHref.baseVal, doc.baseURI).href
          : (anchor as HTMLAnchorElement).href;
      if (/^https?:/i.test(href)) onLink(href);
    };
    doc.addEventListener("click", handler, true);
    return () => doc.removeEventListener("click", handler, true);
  };

  const destroy = () => {
    restoreInline();
    doc.getElementById(STYLE_ID)?.remove();
    doc.head.querySelectorAll(`link[id^="${FONT_LINK_PREFIX}"]`).forEach((link) => link.remove());
  };

  snapshot();
  return { palette: computePalette(), apply, exportCss, guardLinks, destroy };
}

export type RestyleEngine = NonNullable<ReturnType<typeof createRestyleEngine>>;
