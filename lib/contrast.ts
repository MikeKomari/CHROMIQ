import type { Tokens } from "@/types/workspace";

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

export function semanticPairs(tokens: Tokens) {
  return [
    { label: "Accent on ink", token: "accent", fg: tokens.accent, bg: tokens.ink },
    { label: "Accent on paper", token: "accent", fg: tokens.accent, bg: tokens.paper },
    { label: "Accent soft on ink", token: "accentSoft", fg: tokens.accentSoft, bg: tokens.ink },
    { label: "Accent soft on paper", token: "accentSoft", fg: tokens.accentSoft, bg: tokens.paper },
    { label: "Ink on paper", token: "ink", fg: tokens.ink, bg: tokens.paper },
    { label: "Paper on ink", token: "paper", fg: tokens.paper, bg: tokens.ink },
    { label: "Muted on paper", token: "muted", fg: tokens.muted, bg: tokens.paper },
    { label: "Muted on ink", token: "muted", fg: tokens.muted, bg: tokens.ink },
  ];
}

