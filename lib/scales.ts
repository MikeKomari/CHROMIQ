import { hexToHsl, hslToHex } from "@/lib/color-math";
import type { Tokens } from "@/types/workspace";

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type RampStep = (typeof RAMP_STEPS)[number];

const RAMP_LIGHTNESS: Record<RampStep, number> = {
  50: 97,
  100: 93,
  200: 86,
  300: 76,
  400: 64,
  500: 52,
  600: 43,
  700: 35,
  800: 27,
  900: 20,
  950: 13,
};

/** Saturation multiplier per step: full in the middle, eased down at the pale and very dark ends. */
const RAMP_SATURATION: Record<RampStep, number> = {
  50: 0.85,
  100: 0.9,
  200: 0.95,
  300: 1,
  400: 1,
  500: 1,
  600: 1,
  700: 1,
  800: 0.95,
  900: 0.9,
  950: 0.85,
};

/** 11-step tint/shade ramp that keeps the input hue. Invalid hex input falls back to #808080. Always #rrggbb. */
export function colorRamp(hex: string): Record<RampStep, string> {
  const base = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#808080";
  const { h, s } = hexToHsl(base);
  const ramp = {} as Record<RampStep, string>;
  for (const step of RAMP_STEPS) {
    ramp[step] = hslToHex(h, Math.min(100, s * RAMP_SATURATION[step]), RAMP_LIGHTNESS[step]);
  }
  return ramp;
}

export const TYPE_STEPS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"] as const;
export type TypeStep = (typeof TYPE_STEPS)[number];

/** Modular ratio from tokens.typeScale (0.8–1.3): 0.8 -> 1.125, 1 -> 1.25, 1.3 -> 1.414 (piecewise linear, clamped). */
export function typeRatio(typeScale: number): number {
  const t = Number.isFinite(typeScale) ? Math.max(0.8, Math.min(1.3, typeScale)) : 1;
  if (t <= 1) return 1.125 + ((t - 0.8) / 0.2) * (1.25 - 1.125);
  return 1.25 + ((t - 1) / 0.3) * (1.414 - 1.25);
}

/** base = 16px; step i relative to base = 16 * ratio^(i - 2); px rounded to 2 decimals, rem = px/16 to 4 decimals. */
export function typeScaleSteps(tokens: Tokens): { step: TypeStep; px: number; rem: string }[] {
  const ratio = typeRatio(tokens.typeScale);
  return TYPE_STEPS.map((step, index) => {
    const px = Math.round(16 * ratio ** (index - 2) * 100) / 100;
    return { step, px, rem: `${Number((px / 16).toFixed(4))}rem` };
  });
}

const SPACING_MULTIPLIERS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];

/** Multipliers [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16] of tokens.spacing; step names "0.5","1",...,"16". */
export function spacingScale(tokens: Tokens): { step: string; px: number }[] {
  return SPACING_MULTIPLIERS.map((multiplier) => ({
    step: String(multiplier),
    px: Math.round(tokens.spacing * multiplier * 100) / 100,
  }));
}
