import { defaultTokens } from "@/data/workspace";
import { starterAccents } from "@/lib/colors";
import { contrastRatio } from "@/lib/contrast";
import type { Tokens } from "@/types/workspace";

/**
 * Keeps only the entries whose primitive type matches the token model.
 *
 * `normalizeTokens` merges over the defaults; it does not coerce, because it
 * was written for data this app produced. Four of its callers do not pass
 * that: localStorage, a `?share=` payload, a `?s=` short link, and an
 * imported token file. A share link carrying `displayFont: {}` reached
 * `loadFontFamily`, where `family.replace(...)` threw inside an effect and
 * dropped whoever opened the link into the recovery screen.
 *
 * Filtering here rather than at the call sites is deliberate: the cloud path
 * had this guard and the two share paths did not, which is exactly the shape
 * of bug that comes back the next time someone adds a caller.
 *
 * Keys this build does not recognise are kept. A system written by a newer
 * build has to survive a round-trip through an older one, and nothing reads
 * an unknown key, so it cannot reach a sink. Only a KNOWN token carrying the
 * wrong type is dropped, which is what the crash was.
 */
export function usableTokens(partial: unknown): Partial<Tokens> {
  if (typeof partial !== "object" || partial === null) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    const expected = typeof (defaultTokens as Record<string, unknown>)[key];
    if (expected !== "undefined") {
      if (typeof value !== expected) continue; // wrong type: leave the default
      if (expected === "number" && !Number.isFinite(value as number)) continue;
    }
    clean[key] = value;
  }
  return clean as Partial<Tokens>;
}

/**
 * Merge stored or imported tokens over the defaults. Data saved before light/dark
 * pairs existed (no `darkPaper`) used one accent for the dark preview and never
 * showed ink/paper/muted/line there, so the old accent becomes the dark accent
 * and the light theme gets a light-safe accent from the same hue.
 */
export function normalizeTokens(input: Partial<Tokens>): Tokens {
  // Anything the model does not recognise, or that carries the wrong type, is
  // dropped before it can reach state or a template literal.
  const partial = usableTokens(input);
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
