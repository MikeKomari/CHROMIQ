import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import {
  contrastRatio,
  contrastStatus,
  failingPairs,
  semanticPairs,
} from "@/lib/contrast";
import type { Tokens } from "@/types/workspace";

describe("contrastRatio", () => {
  it("is 21:1 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#ffffff", "#000000")).toBe(21);
  });

  it("is 1:1 for identical colors", () => {
    expect(contrastRatio("#336699", "#336699")).toBe(1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  });

  it.each([
    ["#767676", "#ffffff", 4.54], // the lightest gray that passes AA on white
    ["#777777", "#ffffff", 4.48], // one step lighter fails AA
    ["#595959", "#ffffff", 7],
    ["#ff0000", "#ffffff", 4],
    ["#0000ff", "#ffffff", 8.59],
  ])("matches published WCAG value for %s on %s", (fg, bg, expected) => {
    expect(contrastRatio(fg, bg)).toBe(expected);
  });

  it("rounds to two decimals", () => {
    const ratio = contrastRatio("#5f6e1f", "#f4f2ea");
    expect(ratio).toBe(Number(ratio.toFixed(2)));
  });

  it("accepts hex without a leading #", () => {
    expect(contrastRatio("000000", "ffffff")).toBe(21);
  });

  it("treats malformed (non 6-digit) hex as luminance 0 rather than throwing", () => {
    // "#fff" has length 3 so it counts as black: black vs white = 21
    expect(contrastRatio("#fff", "#ffffff")).toBe(21);
    expect(contrastRatio("", "#000000")).toBe(1);
    expect(() => contrastRatio("not-a-color", "#ffffff")).not.toThrow();
  });
});

describe("contrastStatus", () => {
  it.each([
    [21, "AAA"],
    [7, "AAA"],
    [6.99, "AA"],
    [4.5, "AA"],
    [4.49, "AA large"],
    [3, "AA large"],
    [2.99, "Fail"],
    [1, "Fail"],
    [0, "Fail"],
  ])("ratio %d -> %s", (ratio, status) => {
    expect(contrastStatus(ratio)).toBe(status);
  });
});

describe("semanticPairs", () => {
  const pairs = semanticPairs(defaultTokens);

  it("returns five pairs for each theme, light first", () => {
    expect(pairs).toHaveLength(10);
    expect(pairs.slice(0, 5).every((p) => p.theme === "light")).toBe(true);
    expect(pairs.slice(5).every((p) => p.theme === "dark")).toBe(true);
    expect(pairs.slice(0, 5).map((p) => p.label)).toEqual(
      pairs.slice(5).map((p) => p.label),
    );
  });

  it("requires 4.5:1 for text pairs and 3:1 for muted and accent", () => {
    const light = pairs.filter((p) => p.theme === "light");
    expect(Object.fromEntries(light.map((p) => [p.label, p.min]))).toEqual({
      "Text on background": 4.5,
      "Muted on background": 3,
      "Accent on background": 3,
      "Label on accent": 4.5,
      "Text on accent soft": 4.5,
    });
  });

  it("maps pairs to the right tokens and colors per theme", () => {
    const find = (theme: string, label: string) =>
      pairs.find((p) => p.theme === theme && p.label === label)!;
    expect(find("light", "Text on background")).toMatchObject({
      token: "ink",
      fg: defaultTokens.ink,
      bg: defaultTokens.paper,
    });
    expect(find("dark", "Text on background")).toMatchObject({
      token: "darkInk",
      fg: defaultTokens.darkInk,
      bg: defaultTokens.darkPaper,
    });
    expect(find("dark", "Accent on background")).toMatchObject({
      token: "darkAccent",
      fg: defaultTokens.darkAccent,
      bg: defaultTokens.darkPaper,
    });
    expect(find("light", "Text on accent soft")).toMatchObject({
      token: "accentSoft",
      fg: defaultTokens.ink,
      bg: defaultTokens.accentSoft,
    });
  });

  it("picks the better-reading neutral as the label color on accent", () => {
    const dark = { ...defaultTokens, accent: "#000000", paper: "#ffffff", ink: "#222222" };
    const onBlack = semanticPairs(dark).find(
      (p) => p.theme === "light" && p.label === "Label on accent",
    )!;
    expect(onBlack.fg).toBe("#ffffff");
    expect(onBlack.bg).toBe("#000000");

    const light = { ...defaultTokens, accent: "#ffffff", paper: "#f0f0f0", ink: "#000000" };
    const onWhite = semanticPairs(light).find(
      (p) => p.theme === "light" && p.label === "Label on accent",
    )!;
    expect(onWhite.fg).toBe("#000000");
  });

  it("falls back to default colors for malformed tokens instead of throwing", () => {
    const broken = { ...defaultTokens, ink: "red", paper: "#xyz" } as Tokens;
    const result = semanticPairs(broken).find(
      (p) => p.theme === "light" && p.label === "Text on background",
    )!;
    expect(result.fg).toBe(defaultTokens.ink);
    expect(result.bg).toBe(defaultTokens.paper);
  });
});

describe("failingPairs", () => {
  it("is empty for the default tokens, which are designed to pass", () => {
    expect(failingPairs(defaultTokens)).toEqual([]);
  });

  it("reports the light text pair when ink matches paper", () => {
    const failing = failingPairs({ ...defaultTokens, ink: defaultTokens.paper });
    const labels = failing.map((p) => `${p.theme}:${p.label}`);
    expect(labels).toContain("light:Text on background");
    expect(labels).toContain("light:Text on accent soft");
    expect(failing.every((p) => p.theme === "light")).toBe(true);
    for (const pair of failing) expect(contrastRatio(pair.fg, pair.bg)).toBeLessThan(pair.min);
  });

  it("reports only the dark theme when only dark tokens are broken", () => {
    const failing = failingPairs({ ...defaultTokens, darkMuted: defaultTokens.darkPaper });
    expect(failing).toHaveLength(1);
    expect(failing[0]).toMatchObject({
      theme: "dark",
      label: "Muted on background",
      token: "darkMuted",
    });
  });

  it("applies each pair's own minimum: muted passes at 3:1 where text would not", () => {
    // #949494 on white is 3.03:1 - fine for muted/accent (3), not for text (4.5).
    const tokens = {
      ...defaultTokens,
      paper: "#ffffff",
      muted: "#949494",
    };
    const labels = failingPairs(tokens).map((p) => `${p.theme}:${p.label}`);
    expect(labels).not.toContain("light:Muted on background");
    expect(contrastRatio("#949494", "#ffffff")).toBe(3.03);
    const tokens2 = { ...tokens, ink: "#949494" };
    expect(failingPairs(tokens2).map((p) => p.label)).toContain("Text on background");
  });
});
