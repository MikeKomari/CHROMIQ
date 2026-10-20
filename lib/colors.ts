import { defaultTokens } from "@/data/workspace";
import { hexToHsl, hslToHex } from "@/lib/color-math";
import { contrastRatio, failingPairs } from "@/lib/contrast";
import type { HarmonyMode, Starter, Tokens } from "@/types/workspace";

export { hexToHsl, hslToHex };

const accentKeys: (keyof Tokens)[] = [
  "accent",
  "accentSoft",
  "darkAccent",
  "darkAccentSoft",
];

const between = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));

/** Accent pair for both themes from one starter color (the starter color is the dark-theme accent). */
export function starterAccents(
  starter: Starter,
  paper: string = defaultTokens.paper,
): Partial<Tokens> {
  const { h, s } = hexToHsl(starter.accent);
  let lightness = 42;
  let accent = hslToHex(h, Math.min(s, 70), lightness);
  while (lightness > 20 && contrastRatio(accent, paper) < 4.5) {
    lightness -= 2;
    accent = hslToHex(h, Math.min(s, 70), lightness);
  }
  return {
    accent,
    accentSoft: hslToHex(h, 45, 86),
    darkAccent: starter.accent,
    darkAccentSoft: hslToHex(h, 40, 22),
  };
}

export function randomPalette(
  current: Tokens,
  harmony: HarmonyMode = "analogous",
): { changes: Partial<Tokens>; passed: boolean } {
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
  let changes: Partial<Tokens> = {};
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const hue = Math.floor(Math.random() * 360);
    const softHue = (hue + offset) % 360;
    changes = {
      accent: hslToHex(hue, between(55, 80), between(35, 45)),
      accentSoft: hslToHex(
        softHue,
        harmony === "monochrome" ? 48 : between(55, 72),
        between(90, 93),
      ),
      darkAccent: hslToHex(hue, between(60, 80), between(62, 70)),
      darkAccentSoft: hslToHex(softHue, between(30, 45), between(18, 24)),
    };
    const failing = failingPairs({ ...current, ...changes }).filter((pair) =>
      accentKeys.includes(pair.token),
    );
    if (!failing.length) return { changes, passed: true };
  }
  return { changes, passed: false };
}
