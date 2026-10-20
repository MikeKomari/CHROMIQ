import { contrastRatio } from "@/lib/contrast";
import { defaultTokens } from "@/data/workspace";
import { hexToHsl, hslToHex } from "@/lib/color-math";
import type {
  Mode,
  ModePreference,
  ThemeColors,
  ThemeRole,
  Tokens,
} from "@/types/workspace";

/** Which token holds each semantic role, per theme. */
export const themeTokenKeys: Record<Mode, Record<ThemeRole, keyof Tokens>> = {
  light: {
    background: "paper",
    foreground: "ink",
    muted: "muted",
    line: "line",
    accent: "accent",
    accentSoft: "accentSoft",
  },
  dark: {
    background: "darkPaper",
    foreground: "darkInk",
    muted: "darkMuted",
    line: "darkLine",
    accent: "darkAccent",
    accentSoft: "darkAccentSoft",
  },
};

export const themeRoleLabels: Record<ThemeRole, string> = {
  background: "Background",
  foreground: "Text",
  muted: "Muted text",
  line: "Line",
  accent: "Accent",
  accentSoft: "Accent soft",
};

const hexPattern = /^#[0-9a-f]{6}$/i;

/** Colors for one theme. A missing or malformed token falls back to its default so a bad state never crashes render. */
export function themeColors(tokens: Tokens, mode: Mode): ThemeColors {
  const keys = themeTokenKeys[mode];
  const pick = (key: keyof Tokens) => {
    const value = tokens[key];
    return typeof value === "string" && hexPattern.test(value)
      ? value
      : (defaultTokens[key] as string);
  };
  return {
    background: pick(keys.background),
    foreground: pick(keys.foreground),
    muted: pick(keys.muted),
    line: pick(keys.line),
    accent: pick(keys.accent),
    accentSoft: pick(keys.accentSoft),
  };
}

/** Label color for filled accent controls: whichever theme neutral reads better. */
export function onAccent(colors: ThemeColors) {
  return contrastRatio(colors.background, colors.accent) >=
    contrastRatio(colors.foreground, colors.accent)
    ? colors.background
    : colors.foreground;
}

/** A starting dark theme generated from the light one. Keeps hues, flips lightness. */
export function deriveDarkTheme(tokens: Tokens): Partial<Tokens> {
  const shift = (hex: string, l: number, maxS = 100) => {
    const { h, s } = hexToHsl(hex);
    return hslToHex(h, Math.min(s, maxS), l);
  };
  return {
    darkPaper: shift(tokens.paper, 8, 14),
    darkInk: shift(tokens.ink, 93, 14),
    darkMuted: shift(tokens.muted, 60, 10),
    darkLine: shift(tokens.line, 20, 10),
    darkAccent: shift(tokens.accent, 66),
    darkAccentSoft: shift(tokens.accentSoft, 24, 40),
  };
}

export function resolveMode(preference: ModePreference): Mode {
  if (preference !== "system") return preference;
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}
