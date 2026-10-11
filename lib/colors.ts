import type { HarmonyMode, Tokens } from "@/types/workspace";

export function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number) {
  const a = (s * Math.min(l / 100, 1 - l / 100)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color =
      l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function randomPalette(
  current: Tokens,
  harmony: HarmonyMode = "analogous",
) {
  const hue = Math.floor(Math.random() * 360);
  const offset =
    harmony === "complementary"
      ? 180
      : harmony === "triadic"
        ? 120
        : harmony === "split-complementary"
          ? 150
          : harmony === "monochrome"
            ? 0
            : 28;
  const softHue = (hue + offset) % 360;
  return {
    ...current,
    accent: hslToHex(hue, 72 + Math.floor(Math.random() * 18), 64),
    accentSoft: hslToHex(softHue, harmony === "monochrome" ? 48 : 72, 88),
  };
}

export function tokenCss(tokens: Tokens, mode: "dark" | "light") {
  return `:root {\n  --prism-accent: ${tokens.accent};\n  --prism-accent-soft: ${tokens.accentSoft};\n  --prism-${mode === "dark" ? "ink" : "paper"}: ${tokens.ink};\n  --prism-radius: ${tokens.radius}px;\n  --prism-space: ${tokens.spacing}px;\n}`;
}
