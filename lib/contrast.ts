import { onAccent, themeColors, themeTokenKeys } from "@/lib/theme";
import type { Mode, Tokens } from "@/types/workspace";

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 0;
  return (
    0.2126 * channel(Number.parseInt(value.slice(0, 2), 16)) +
    0.7152 * channel(Number.parseInt(value.slice(2, 4), 16)) +
    0.0722 * channel(Number.parseInt(value.slice(4, 6), 16))
  );
}

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function contrastStatus(ratio: number) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "Fail";
}

export type ContrastPair = {
  label: string;
  theme: Mode;
  token: keyof Tokens;
  fg: string;
  bg: string;
  min: number;
};

/** Required contrast pairs for both themes, light first. */
export function semanticPairs(tokens: Tokens): ContrastPair[] {
  return (["light", "dark"] as const).flatMap((theme) => {
    const colors = themeColors(tokens, theme);
    const keys = themeTokenKeys[theme];
    return [
      {
        label: "Text on background",
        theme,
        token: keys.foreground,
        fg: colors.foreground,
        bg: colors.background,
        min: 4.5,
      },
      {
        label: "Muted on background",
        theme,
        token: keys.muted,
        fg: colors.muted,
        bg: colors.background,
        min: 3,
      },
      {
        label: "Accent on background",
        theme,
        token: keys.accent,
        fg: colors.accent,
        bg: colors.background,
        min: 3,
      },
      {
        label: "Label on accent",
        theme,
        token: keys.accent,
        fg: onAccent(colors),
        bg: colors.accent,
        min: 4.5,
      },
      {
        label: "Text on accent soft",
        theme,
        token: keys.accentSoft,
        fg: colors.foreground,
        bg: colors.accentSoft,
        min: 4.5,
      },
    ];
  });
}

export function failingPairs(tokens: Tokens): ContrastPair[] {
  return semanticPairs(tokens).filter(
    (pair) => contrastRatio(pair.fg, pair.bg) < pair.min,
  );
}
