import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import { contrastRatio } from "@/lib/contrast";
import { normalizeTokens } from "@/lib/tokens";
import type { Tokens } from "@/types/workspace";

describe("normalizeTokens", () => {
  it("returns exactly the defaults for an empty object (new-style data, no migration)", () => {
    // An empty object has no darkPaper, so the legacy migration runs; the result must still be a full Tokens.
    const result = normalizeTokens({});
    expect(Object.keys(result).sort()).toEqual(Object.keys(defaultTokens).sort());
  });

  it("fills in missing keys from the defaults when darkPaper is present", () => {
    const result = normalizeTokens({ darkPaper: "#000000", radius: 4 });
    expect(result).toEqual({ ...defaultTokens, darkPaper: "#000000", radius: 4 });
  });

  it("lets stored values override defaults and does not mutate its input", () => {
    const input: Partial<Tokens> = { darkPaper: "#111111", accent: "#123456", spacing: 10 };
    const snapshot = { ...input };
    const result = normalizeTokens(input);
    expect(result.accent).toBe("#123456");
    expect(result.spacing).toBe(10);
    expect(input).toEqual(snapshot);
    expect(result).not.toBe(defaultTokens);
  });

  it("does not clamp out-of-range numbers (validateTokens is the gatekeeper)", () => {
    const result = normalizeTokens({ darkPaper: "#000000", radius: -5, shadow: 99 });
    expect(result.radius).toBe(-5);
    expect(result.shadow).toBe(99);
  });

  it("passes unknown keys through untouched", () => {
    const result = normalizeTokens({
      darkPaper: "#000000",
      // @ts-expect-error simulating junk from a stored blob
      mystery: 1,
    });
    expect((result as Record<string, unknown>).mystery).toBe(1);
  });

  describe("legacy data without darkPaper", () => {
    const legacy: Partial<Tokens> = {
      accent: "#b7cc6a", // old single accent, used in the dark preview
      accentSoft: "#2f3a1c",
      ink: "#10110f",
      paper: "#f4f2ea",
    };
    const result = normalizeTokens(legacy);

    it("moves the old accent to darkAccent", () => {
      expect(result.darkAccent).toBe("#b7cc6a");
    });

    it("derives a light-safe accent that reads on the paper", () => {
      expect(result.accent).not.toBe("#b7cc6a");
      expect(contrastRatio(result.accent, result.paper)).toBeGreaterThanOrEqual(4.5);
    });

    it("replaces an accentSoft that cannot hold ink text", () => {
      // #2f3a1c is a dark swatch; ink (#10110f) on it is far below 4.5:1.
      expect(contrastRatio("#10110f", "#2f3a1c")).toBeLessThan(4.5);
      expect(result.accentSoft).not.toBe("#2f3a1c");
      expect(contrastRatio(result.ink, result.accentSoft)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps an accentSoft that already reads with ink", () => {
      const kept = normalizeTokens({ accent: "#b7cc6a", accentSoft: "#e4ebc4", ink: "#10110f" });
      expect(kept.accentSoft).toBe("#e4ebc4");
    });

    it("resets muted and line to the defaults and derives darkAccentSoft", () => {
      const withCustom = normalizeTokens({ accent: "#b7cc6a", muted: "#ff00ff", line: "#00ff00" });
      expect(withCustom.muted).toBe(defaultTokens.muted);
      expect(withCustom.line).toBe(defaultTokens.line);
      expect(withCustom.darkAccentSoft).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe("garbage input", () => {
    it("falls back to the default dark accent when the old accent is not a hex color", () => {
      const result = normalizeTokens({ accent: "not-a-color" });
      expect(result.darkAccent).toBe(defaultTokens.darkAccent);
      expect(result.accent).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("falls back to the default dark accent for a short hex", () => {
      expect(normalizeTokens({ accent: "#fff" }).darkAccent).toBe(defaultTokens.darkAccent);
    });

    it("does not throw on an empty accent or on undefined values", () => {
      expect(() => normalizeTokens({ accent: "" })).not.toThrow();
      expect(() => normalizeTokens({ darkPaper: undefined, accent: undefined })).not.toThrow();
    });

    it("treats an explicit undefined darkPaper as legacy data", () => {
      const result = normalizeTokens({ darkPaper: undefined, accent: "#b7cc6a" });
      expect(result.darkAccent).toBe("#b7cc6a");
    });

    it("always yields six-digit hex for the accent family, whatever the input", () => {
      for (const accent of ["", "red", "#fff", "#GGGGGG", "#b7cc6a"]) {
        const result = normalizeTokens({ accent });
        for (const key of ["accent", "accentSoft", "darkAccent", "darkAccentSoft"] as const)
          expect(result[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });
});
