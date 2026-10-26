import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import { validateTokens } from "@/lib/validate";
import type { Tokens } from "@/types/workspace";

const colorKeys = [
  "accent",
  "accentSoft",
  "ink",
  "paper",
  "muted",
  "line",
  "darkAccent",
  "darkAccentSoft",
  "darkInk",
  "darkPaper",
  "darkMuted",
  "darkLine",
  "success",
  "warning",
  "danger",
] as const;

const withTokens = (changes: Partial<Tokens>): Tokens => ({ ...defaultTokens, ...changes });

describe("validateTokens", () => {
  it("returns no errors for the default tokens", () => {
    expect(validateTokens(defaultTokens)).toEqual([]);
  });

  describe("colors", () => {
    it.each(colorKeys)("flags a malformed %s", (key) => {
      expect(validateTokens(withTokens({ [key]: "blue" }))).toEqual([
        `${key} must be a #rrggbb color.`,
      ]);
    });

    it.each(["#fff", "#12345", "#1234567", "123456", "#gggggg", "", " #123456", "#123456 "])(
      "rejects %j",
      (bad) => {
        expect(validateTokens(withTokens({ accent: bad }))).toHaveLength(1);
      },
    );

    it("accepts upper and lower case hex", () => {
      expect(validateTokens(withTokens({ accent: "#ABCDEF", ink: "#abcdef" }))).toEqual([]);
    });

    it("rejects non-string values by coercing them", () => {
      expect(validateTokens(withTokens({ accent: undefined as unknown as string }))).toEqual([
        "accent must be a #rrggbb color.",
      ]);
      expect(validateTokens(withTokens({ accent: null as unknown as string }))).toHaveLength(1);
    });

    it("reports every bad color, in key order", () => {
      const errors = validateTokens(withTokens({ danger: "x", accent: "y" }));
      expect(errors).toEqual(["accent must be a #rrggbb color.", "danger must be a #rrggbb color."]);
    });
  });

  describe("numbers", () => {
    it("allows zero radius but not negative", () => {
      expect(validateTokens(withTokens({ radius: 0 }))).toEqual([]);
      expect(validateTokens(withTokens({ radius: -1 }))).toEqual(["Radius cannot be negative."]);
    });

    it("requires spacing of at least 1px", () => {
      expect(validateTokens(withTokens({ spacing: 1 }))).toEqual([]);
      expect(validateTokens(withTokens({ spacing: 0.99 }))).toEqual(["Spacing must be at least 1px."]);
    });

    it("allows zero border width but not negative", () => {
      expect(validateTokens(withTokens({ borderWidth: 0 }))).toEqual([]);
      expect(validateTokens(withTokens({ borderWidth: -0.5 }))).toEqual(["Border width cannot be negative."]);
    });

    it("limits elevation to 0-4 inclusive", () => {
      expect(validateTokens(withTokens({ shadow: 0 }))).toEqual([]);
      expect(validateTokens(withTokens({ shadow: 4 }))).toEqual([]);
      expect(validateTokens(withTokens({ shadow: -1 }))).toEqual(["Elevation must be between 0 and 4."]);
      expect(validateTokens(withTokens({ shadow: 5 }))).toEqual(["Elevation must be between 0 and 4."]);
    });

    it("allows zero motion but not negative", () => {
      expect(validateTokens(withTokens({ motion: 0 }))).toEqual([]);
      expect(validateTokens(withTokens({ motion: -1 }))).toEqual(["Motion duration cannot be negative."]);
    });

    it("requires a positive type scale and line height", () => {
      expect(validateTokens(withTokens({ typeScale: 0 }))).toEqual(["Type scale must be positive."]);
      expect(validateTokens(withTokens({ typeScale: -1 }))).toEqual(["Type scale must be positive."]);
      expect(validateTokens(withTokens({ lineHeight: 0 }))).toEqual(["Line height must be positive."]);
    });

    it("allows negative tracking", () => {
      expect(validateTokens(withTokens({ tracking: -0.5 }))).toEqual([]);
    });
  });

  describe("breakpoints", () => {
    it("must be positive", () => {
      const errors = validateTokens(withTokens({ breakpointSm: 0 }));
      expect(errors).toContain("Breakpoints must be positive.");
    });

    it("must strictly increase sm < md < lg", () => {
      expect(validateTokens(withTokens({ breakpointSm: 768, breakpointMd: 768 }))).toEqual([
        "Breakpoints must increase: sm < md < lg.",
      ]);
      expect(validateTokens(withTokens({ breakpointMd: 2000 }))).toEqual([
        "Breakpoints must increase: sm < md < lg.",
      ]);
      expect(validateTokens(withTokens({ breakpointLg: 700 }))).toEqual([
        "Breakpoints must increase: sm < md < lg.",
      ]);
    });

    it("reports both messages when a breakpoint is non-positive and the order breaks", () => {
      const errors = validateTokens(withTokens({ breakpointSm: -10, breakpointMd: -20, breakpointLg: -30 }));
      expect(errors).toEqual([
        "Breakpoints must be positive.",
        "Breakpoints must increase: sm < md < lg.",
      ]);
    });
  });

  it("collects several independent errors at once", () => {
    const errors = validateTokens(withTokens({ accent: "x", radius: -1, shadow: 9 }));
    expect(errors).toEqual([
      "accent must be a #rrggbb color.",
      "Radius cannot be negative.",
      "Elevation must be between 0 and 4.",
    ]);
  });

  it("rejects NaN, which every range comparison would otherwise let through", () => {
    // NaN < 0 is false, so without an explicit finite check a NaN radius
    // validates clean and exports as `NaNpx`.
    expect(validateTokens(withTokens({ radius: NaN }))).toEqual([
      "radius must be a number.",
    ]);
  });

  it("rejects Infinity and non-numeric values on every numeric token", () => {
    expect(validateTokens(withTokens({ spacing: Infinity }))).toContain(
      "spacing must be a number.",
    );
    expect(validateTokens(withTokens({ motion: -Infinity }))).toContain(
      "motion must be a number.",
    );
    expect(
      validateTokens(withTokens({ typeScale: undefined as unknown as number })),
    ).toContain("typeScale must be a number.");
  });

  it("reports every NaN numeric token, not just the first", () => {
    const errors = validateTokens(
      withTokens({ radius: NaN, spacing: NaN, lineHeight: NaN }),
    );
    expect(errors).toContain("radius must be a number.");
    expect(errors).toContain("spacing must be a number.");
    expect(errors).toContain("lineHeight must be a number.");
  });
});
