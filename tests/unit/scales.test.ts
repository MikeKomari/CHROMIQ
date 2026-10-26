import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import { hexToHsl } from "@/lib/color-math";
import {
  colorRamp,
  RAMP_STEPS,
  spacingScale,
  TYPE_STEPS,
  typeRatio,
  typeScaleSteps,
} from "@/lib/scales";

describe("colorRamp", () => {
  const ramp = colorRamp("#3b82f6");

  it("has every step 50-950 as a #rrggbb color", () => {
    expect(Object.keys(ramp).map(Number)).toEqual([...RAMP_STEPS]);
    for (const step of RAMP_STEPS) expect(ramp[step]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("gets monotonically darker from 50 to 950", () => {
    const lightness = RAMP_STEPS.map((step) => hexToHsl(ramp[step]).l);
    for (let i = 1; i < lightness.length; i++) expect(lightness[i]).toBeLessThan(lightness[i - 1]);
  });

  it("keeps the input hue across the ramp (within rounding drift)", () => {
    const { h } = hexToHsl("#3b82f6");
    for (const step of [200, 300, 400, 500, 600, 700, 800] as const) {
      expect(Math.abs(hexToHsl(ramp[step]).h - h)).toBeLessThan(4);
    }
  });

  it("targets the documented lightness at the ends and middle", () => {
    expect(hexToHsl(ramp[50]).l).toBeCloseTo(97, 0);
    expect(hexToHsl(ramp[500]).l).toBeCloseTo(52, 0);
    expect(hexToHsl(ramp[950]).l).toBeCloseTo(13, 0);
  });

  it("is deterministic", () => {
    expect(colorRamp("#3b82f6")).toEqual(ramp);
  });

  it("produces a neutral gray ramp for a gray input", () => {
    const gray = colorRamp("#808080");
    for (const step of RAMP_STEPS) {
      const { s } = hexToHsl(gray[step]);
      expect(s).toBeLessThan(1);
    }
  });

  it.each(["", "red", "#12", "#12345", "#1234567", "#gggggg", "3b82f6"])(
    "falls back to the #808080 ramp for invalid input %j",
    (bad) => {
      expect(colorRamp(bad)).toEqual(colorRamp("#808080"));
    },
  );

  it("accepts uppercase hex", () => {
    expect(colorRamp("#3B82F6")).toEqual(ramp);
  });
});

describe("typeRatio", () => {
  it("hits the documented anchor points", () => {
    expect(typeRatio(0.8)).toBeCloseTo(1.125, 10);
    expect(typeRatio(1)).toBeCloseTo(1.25, 10);
    expect(typeRatio(1.3)).toBeCloseTo(1.414, 10);
  });

  it("interpolates linearly on each side of 1", () => {
    expect(typeRatio(0.9)).toBeCloseTo((1.125 + 1.25) / 2, 10);
    expect(typeRatio(1.15)).toBeCloseTo((1.25 + 1.414) / 2, 10);
  });

  it("clamps out-of-range values", () => {
    expect(typeRatio(0)).toBe(typeRatio(0.8));
    expect(typeRatio(-5)).toBe(typeRatio(0.8));
    expect(typeRatio(99)).toBe(typeRatio(1.3));
  });

  it("treats NaN and Infinity as the neutral 1 (NaN) or clamps (Infinity)", () => {
    expect(typeRatio(NaN)).toBeCloseTo(1.25, 10);
    expect(typeRatio(Infinity)).toBeCloseTo(1.25, 10);
    expect(typeRatio(-Infinity)).toBeCloseTo(1.25, 10);
  });

  it("is non-decreasing over the valid range", () => {
    let last = 0;
    for (let t = 0.8; t <= 1.3; t += 0.05) {
      const r = typeRatio(t);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });
});

describe("typeScaleSteps", () => {
  it("returns the eight named steps in order", () => {
    expect(typeScaleSteps(defaultTokens).map((s) => s.step)).toEqual([...TYPE_STEPS]);
  });

  it("anchors base at 16px / 1rem", () => {
    const base = typeScaleSteps(defaultTokens).find((s) => s.step === "base")!;
    expect(base).toEqual({ step: "base", px: 16, rem: "1rem" });
  });

  it("matches a hand-computed major-third scale at typeScale 1 (rem is derived from the rounded px)", () => {
    const steps = typeScaleSteps({ ...defaultTokens, typeScale: 1 });
    expect(steps.map((s) => s.px)).toEqual([10.24, 12.8, 16, 20, 25, 31.25, 39.06, 48.83]);
    expect(steps.map((s) => s.rem)).toEqual([
      "0.64rem",
      "0.8rem",
      "1rem",
      "1.25rem",
      "1.5625rem",
      "1.9531rem",
      "2.4413rem",
      "3.0519rem",
    ]);
  });

  it("grows faster with a larger typeScale but keeps base fixed", () => {
    const small = typeScaleSteps({ ...defaultTokens, typeScale: 0.8 });
    const large = typeScaleSteps({ ...defaultTokens, typeScale: 1.3 });
    expect(small[2].px).toBe(16);
    expect(large[2].px).toBe(16);
    expect(large[7].px).toBeGreaterThan(small[7].px);
    expect(large[0].px).toBeLessThan(small[0].px);
  });

  it("survives a garbage typeScale by using the neutral ratio", () => {
    expect(typeScaleSteps({ ...defaultTokens, typeScale: NaN })).toEqual(
      typeScaleSteps({ ...defaultTokens, typeScale: 1 }),
    );
  });
});

describe("spacingScale", () => {
  it("scales the documented multipliers by the spacing token", () => {
    expect(spacingScale({ ...defaultTokens, spacing: 8 })).toEqual([
      { step: "0.5", px: 4 },
      { step: "1", px: 8 },
      { step: "1.5", px: 12 },
      { step: "2", px: 16 },
      { step: "3", px: 24 },
      { step: "4", px: 32 },
      { step: "6", px: 48 },
      { step: "8", px: 64 },
      { step: "12", px: 96 },
      { step: "16", px: 128 },
    ]);
  });

  it("rounds to two decimals for fractional spacing", () => {
    const scale = spacingScale({ ...defaultTokens, spacing: 3.333 });
    expect(scale.find((s) => s.step === "1")!.px).toBe(3.33);
    expect(scale.find((s) => s.step === "1.5")!.px).toBe(5);
    expect(scale.find((s) => s.step === "16")!.px).toBe(53.33);
  });

  it("scales linearly", () => {
    const a = spacingScale({ ...defaultTokens, spacing: 4 });
    const b = spacingScale({ ...defaultTokens, spacing: 8 });
    a.forEach((entry, i) => expect(b[i].px).toBe(entry.px * 2));
  });
});
