import { describe, expect, it } from "vitest";

import {
  colorRoleVars,
  cssColorToHex,
  describeElement,
  tokenColor,
  type ColorRole,
} from "@/lib/element-tokens";
import { themeColors } from "@/lib/theme";
import { defaultTokens } from "@/data/workspace";

/**
 * These feed click-to-edit on the canvas, which reads whatever
 * getComputedStyle returns. That string format is the browser's choice, not
 * ours -- Chrome, Safari and Firefox all have their own -- so the parser's
 * failure cases are the real surface here.
 */

describe("cssColorToHex", () => {
  it("parses the rgb() form every engine returns for an opaque colour", () => {
    expect(cssColorToHex("rgb(255, 200, 87)")).toBe("#ffc857");
  });

  it("parses rgb() without commas, as newer engines emit it", () => {
    expect(cssColorToHex("rgb(255 200 87)")).toBe("#ffc857");
  });

  it("parses rgba() with an alpha of one", () => {
    expect(cssColorToHex("rgba(255, 200, 87, 1)")).toBe("#ffc857");
  });

  it("parses the slash alpha form", () => {
    expect(cssColorToHex("rgb(255 200 87 / 0.5)")).toBe("#ffc857");
  });

  it("parses color(srgb …), which Safari returns for wide-gamut values", () => {
    expect(cssColorToHex("color(srgb 1 0 0)")).toBe("#ff0000");
  });

  it("parses color(srgb …) with a slash alpha", () => {
    expect(cssColorToHex("color(srgb 0 0 1 / 0.8)")).toBe("#0000ff");
  });

  it("is case and whitespace insensitive", () => {
    expect(cssColorToHex("  RGB( 255 , 200 , 87 )  ")).toBe("#ffc857");
  });

  it("pads single-digit channels", () => {
    expect(cssColorToHex("rgb(1, 2, 3)")).toBe("#010203");
  });

  it("rounds fractional channels rather than truncating them", () => {
    expect(cssColorToHex("rgb(0.6, 0.4, 255)")).toBe("#0100ff");
  });

  it("clamps channels outside the byte range instead of wrapping", () => {
    // A wrapped 300 would come back as #2c…, which is a different colour.
    expect(cssColorToHex("rgb(300, -20, 87)")).toBe("#ff0057");
  });

  it.each([
    ["a fully transparent rgba", "rgba(0, 0, 0, 0)"],
    ["a fully transparent srgb", "color(srgb 0 0 0 / 0)"],
  ])("returns null for %s, which paints nothing", (_label, value) => {
    // Matching a transparent background to a token would label an element with
    // a colour it does not actually show.
    expect(cssColorToHex(value)).toBeNull();
  });

  it.each([
    ["the transparent keyword", "transparent"],
    ["a named colour", "rebeccapurple"],
    ["a hex string", "#ffc857"],
    ["hsl()", "hsl(45 100% 67%)"],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["too few channels", "rgb(255, 200)"],
    ["non-numeric channels", "rgb(a, b, c)"],
    ["a non-numeric alpha", "rgba(1, 2, 3, x)"],
    ["an unclosed function", "rgb(255, 200, 87"],
    ["another colour space", "color(display-p3 1 0 0)"],
    ["trailing junk", "rgb(255, 200, 87) important"],
  ])("returns null for %s", (_label, value) => {
    expect(cssColorToHex(value)).toBeNull();
  });
});

describe("tokenColor", () => {
  it.each(["background", "foreground", "muted", "line", "accent", "accentSoft"] as const)(
    "returns the %s of the active theme",
    (role) => {
      expect(tokenColor(role, defaultTokens, "dark")).toBe(
        themeColors(defaultTokens, "dark")[role],
      );
    },
  );

  it("returns a different background per theme", () => {
    expect(tokenColor("background", defaultTokens, "dark")).not.toBe(
      tokenColor("background", defaultTokens, "light"),
    );
  });

  it.each(["success", "warning", "danger"] as const)(
    "returns the shared %s token in both themes",
    (role) => {
      expect(tokenColor(role, defaultTokens, "dark")).toBe(defaultTokens[role]);
      expect(tokenColor(role, defaultTokens, "light")).toBe(defaultTokens[role]);
    },
  );

  it("resolves onAccent, which is derived rather than stored", () => {
    const value = tokenColor("onAccent", defaultTokens, "dark");
    expect(value).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("falls back to black for a role it does not know", () => {
    // The caller is UI code reading a role off an element; an undefined here
    // would render as a blank swatch.
    expect(tokenColor("nonsense" as ColorRole, defaultTokens, "dark")).toBe("#000000");
  });
});

describe("colorRoleVars", () => {
  it("names a CSS variable for every role the matcher can return", () => {
    const roles: ColorRole[] = [
      "background",
      "foreground",
      "muted",
      "line",
      "accent",
      "accentSoft",
      "onAccent",
      "success",
      "warning",
      "danger",
    ];
    expect(Object.keys(colorRoleVars).sort()).toEqual([...roles].sort());
  });

  it("uses the chromiq prefix the exports write", () => {
    for (const name of Object.values(colorRoleVars)) {
      expect(name).toMatch(/^--chromiq-/);
    }
  });
});

describe("describeElement", () => {
  /** A stand-in for the one or two properties describeElement reads. */
  const element = (tagName: string, classes: string[] = []) =>
    ({ tagName, classList: classes } as unknown as HTMLElement);

  it("returns the lowercase tag when there is no class", () => {
    expect(describeElement(element("BUTTON"))).toBe("button");
  });

  it("appends the first meaningful class", () => {
    expect(describeElement(element("BUTTON", ["btn-primary", "large"]))).toBe(
      "button · btn-primary",
    );
  });

  it("strips the sf- prefix the preview surfaces use internally", () => {
    expect(describeElement(element("DIV", ["sf-card"]))).toBe("div · card");
  });

  it("skips the edit marker, which is machinery rather than a class the user wrote", () => {
    expect(describeElement(element("P", ["edit", "lede"]))).toBe("p · lede");
  });

  it("falls back to the tag when every class is skipped", () => {
    expect(describeElement(element("P", ["edit"]))).toBe("p");
  });

  it("ignores an empty class name", () => {
    expect(describeElement(element("P", ["", "lede"]))).toBe("p · lede");
  });

  it("does not return a bare separator when sf- is the whole class name", () => {
    // "sf-" strips to "", which must not produce "div · ".
    expect(describeElement(element("DIV", ["sf-"]))).toBe("div");
  });
});
