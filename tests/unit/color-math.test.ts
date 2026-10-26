import { describe, expect, it } from "vitest";
import { hexToHsl, hslToHex } from "@/lib/color-math";

describe("hexToHsl", () => {
  it.each([
    ["#ff0000", 0, 100, 50],
    ["#ffff00", 60, 100, 50],
    ["#00ff00", 120, 100, 50],
    ["#00ffff", 180, 100, 50],
    ["#0000ff", 240, 100, 50],
    ["#ff00ff", 300, 100, 50],
  ])("converts primary/secondary %s to h=%d s=%d l=%d", (hex, h, s, l) => {
    const result = hexToHsl(hex);
    expect(result.h).toBeCloseTo(h, 5);
    expect(result.s).toBeCloseTo(s, 5);
    expect(result.l).toBeCloseTo(l, 5);
  });

  it("returns zero hue and saturation for achromatic colors", () => {
    expect(hexToHsl("#000000")).toEqual({ h: 0, s: 0, l: 0 });
    expect(hexToHsl("#ffffff")).toEqual({ h: 0, s: 0, l: 100 });
    const gray = hexToHsl("#808080");
    expect(gray.h).toBe(0);
    expect(gray.s).toBe(0);
    expect(gray.l).toBeCloseTo(50.2, 1);
  });

  it("accepts input with or without the leading #", () => {
    expect(hexToHsl("336699")).toEqual(hexToHsl("#336699"));
  });

  it("wraps negative hue intermediate values into 0-360 when green < blue under a red max", () => {
    // max is red and g < b, so the (g < b ? 6 : 0) branch applies.
    const { h } = hexToHsl("#ff0080");
    expect(h).toBeGreaterThan(300);
    expect(h).toBeLessThan(360);
    expect(h).toBeCloseTo(329.88, 1);
  });

  it("uses the high-lightness saturation formula above 50% lightness", () => {
    // #ff8080: l = 75%, s = d / (2 - max - min) = 0.498 / (2 - 1 - 0.502) = 100%
    const { s, l } = hexToHsl("#ff8080");
    expect(l).toBeCloseTo(75.1, 1);
    expect(s).toBeCloseTo(100, 0);
  });
});

describe("hslToHex", () => {
  it.each([
    [0, 100, 50, "#ff0000"],
    [120, 100, 50, "#00ff00"],
    [240, 100, 50, "#0000ff"],
    [60, 100, 50, "#ffff00"],
    [0, 0, 0, "#000000"],
    [0, 0, 100, "#ffffff"],
    [0, 0, 50, "#808080"],
  ])("h=%d s=%d l=%d -> %s", (h, s, l, hex) => {
    expect(hslToHex(h, s, l)).toBe(hex);
  });

  it("wraps hue around the circle, including negative values", () => {
    expect(hslToHex(360, 100, 50)).toBe(hslToHex(0, 100, 50));
    expect(hslToHex(480, 100, 50)).toBe(hslToHex(120, 100, 50));
    expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50));
  });

  it("clamps saturation and lightness to 0-100", () => {
    expect(hslToHex(0, 250, 50)).toBe("#ff0000");
    expect(hslToHex(0, -50, 50)).toBe("#808080");
    expect(hslToHex(0, 100, 500)).toBe("#ffffff");
    expect(hslToHex(0, 100, -20)).toBe("#000000");
  });

  it("treats non-finite input as zero instead of producing NaN", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(hslToHex(bad, 100, 50)).toBe("#ff0000");
      expect(hslToHex(0, bad, 50)).toMatch(/^#[0-9a-f]{6}$/);
      expect(hslToHex(0, 100, bad)).toBe("#000000");
    }
  });

  it("always returns a lowercase #rrggbb string", () => {
    for (let h = 0; h < 360; h += 17)
      for (let s = 0; s <= 100; s += 25)
        for (let l = 0; l <= 100; l += 20)
          expect(hslToHex(h, s, l)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("round-trips through hexToHsl to within one channel step", () => {
    for (const hex of ["#5f6e1f", "#b7cc6a", "#d9846b", "#9c9ad6", "#10110f", "#f4f2ea"]) {
      const { h, s, l } = hexToHsl(hex);
      const back = hslToHex(h, s, l);
      for (const i of [1, 3, 5]) {
        const a = parseInt(hex.slice(i, i + 2), 16);
        const b = parseInt(back.slice(i, i + 2), 16);
        expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
      }
    }
  });
});
