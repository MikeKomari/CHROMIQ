import { afterEach, describe, expect, it, vi } from "vitest";

import { randomPalette, starterAccents } from "@/lib/colors";
import { contrastRatio, failingPairs } from "@/lib/contrast";
import { defaultTokens } from "@/data/workspace";
import type { HarmonyMode } from "@/types/workspace";

/**
 * Both functions here feed tokens straight into the preview and the export, so
 * the cases that matter are the ones where no good answer exists: a starter
 * colour that cannot reach contrast on the given paper, and a harmony that
 * boxes the generator in.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

const hex = /^#[0-9a-f]{6}$/i;

describe("starterAccents", () => {
  it("returns the four accent tokens and nothing else", () => {
    expect(Object.keys(starterAccents({ name: "x", meta: "", accent: "#b7cc6a" })).sort()).toEqual([
      "accent",
      "accentSoft",
      "darkAccent",
      "darkAccentSoft",
    ]);
  });

  it("keeps the starter colour as the dark accent", () => {
    const out = starterAccents({ name: "x", meta: "", accent: "#b7cc6a" });
    expect(out.darkAccent).toBe("#b7cc6a");
  });

  it("darkens the light accent until it reads on the default paper", () => {
    const out = starterAccents({ name: "x", meta: "", accent: "#ffff00" });
    expect(contrastRatio(out.accent as string, defaultTokens.paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("gives up at the floor rather than looping, when paper is too close", () => {
    // White text on white paper can never reach 4.5; the loop stops at
    // lightness 20 and returns the darkest candidate it reached.
    const out = starterAccents({ name: "x", meta: "", accent: "#ffffff" }, "#ffffff");
    expect(out.accent).toMatch(hex);
  });

  it("still returns valid hex against a dark paper", () => {
    const out = starterAccents({ name: "x", meta: "", accent: "#333333" }, "#000000");
    for (const value of Object.values(out)) expect(value).toMatch(hex);
  });

  it.each(["#000000", "#ffffff", "#808080"])(
    "returns valid hex for the achromatic starter %s",
    (accent) => {
      const out = starterAccents({ name: "x", meta: "", accent });
      for (const value of Object.values(out)) expect(value).toMatch(hex);
    },
  );

  it("is deterministic for the same inputs", () => {
    const a = starterAccents({ name: "x", meta: "", accent: "#7fbfb4" });
    const b = starterAccents({ name: "x", meta: "", accent: "#7fbfb4" });
    expect(a).toEqual(b);
  });
});

describe("randomPalette", () => {
  it.each<HarmonyMode>([
    "analogous",
    "complementary",
    "triadic",
    "monochrome",
    "split-complementary",
  ])("returns the four accent tokens as valid hex for %s", (harmony) => {
    const { changes } = randomPalette(defaultTokens, harmony);
    expect(Object.keys(changes).sort()).toEqual([
      "accent",
      "accentSoft",
      "darkAccent",
      "darkAccentSoft",
    ]);
    for (const value of Object.values(changes)) expect(value).toMatch(hex);
  });

  it("defaults to analogous when no harmony is given", () => {
    const { changes } = randomPalette(defaultTokens);
    expect(Object.keys(changes)).toHaveLength(4);
  });

  it("reports passed when the result clears every accent pair", () => {
    const { changes, passed } = randomPalette(defaultTokens, "analogous");
    if (passed) {
      const failing = failingPairs({ ...defaultTokens, ...changes }).filter((pair) =>
        ["accent", "accentSoft", "darkAccent", "darkAccentSoft"].includes(pair.token),
      );
      expect(failing).toEqual([]);
    }
  });

  it("gives up after 30 attempts rather than looping for ever", () => {
    // Hue 0 every time, with neutrals that nothing can read against: the
    // generator must come back with its last candidate and passed: false.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const hostile = {
      ...defaultTokens,
      ink: "#ffffff",
      paper: "#ffffff",
      darkInk: "#000000",
      darkPaper: "#000000",
    };
    const { changes, passed } = randomPalette(hostile, "monochrome");
    expect(passed).toBe(false);
    // Still a usable palette, so the caller has something to show.
    for (const value of Object.values(changes)) expect(value).toMatch(hex);
  });

  it("always returns a full set of changes, passed or not", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    const { changes } = randomPalette(defaultTokens, "triadic");
    expect(Object.keys(changes)).toHaveLength(4);
    for (const value of Object.values(changes)) expect(value).toMatch(hex);
  });

  it("varies between calls, so the control actually explores", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      seen.add(randomPalette(defaultTokens, "analogous").changes.accent as string);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
