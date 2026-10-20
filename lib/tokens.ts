import { defaultTokens } from "@/data/workspace";
import { starterAccents } from "@/lib/colors";
import { contrastRatio } from "@/lib/contrast";
import type { Tokens } from "@/types/workspace";

/**
 * Merge stored or imported tokens over the defaults. Data saved before light/dark
 * pairs existed (no `darkPaper`) used one accent for the dark preview and never
 * showed ink/paper/muted/line there, so the old accent becomes the dark accent
 * and the light theme gets a light-safe accent from the same hue.
 */
export function normalizeTokens(partial: Partial<Tokens>): Tokens {
  const merged = { ...defaultTokens, ...partial };
  if (partial.darkPaper !== undefined) return merged;
  const oldAccent = /^#[0-9a-f]{6}$/i.test(merged.accent)
    ? merged.accent
    : defaultTokens.darkAccent;
  const derived = starterAccents({ name: "", meta: "", accent: oldAccent }, merged.paper);
  const softReadable = contrastRatio(merged.ink, merged.accentSoft) >= 4.5;
  return {
    ...merged,
    accent: derived.accent as string,
    accentSoft: softReadable ? merged.accentSoft : (derived.accentSoft as string),
    muted: defaultTokens.muted,
    line: defaultTokens.line,
    darkAccent: oldAccent,
    darkAccentSoft: derived.darkAccentSoft as string,
  };
}
