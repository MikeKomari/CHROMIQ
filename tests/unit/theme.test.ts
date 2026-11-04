import { afterEach, describe, expect, it, vi } from "vitest";

import {
  deriveDarkTheme,
  onAccent,
  resolveMode,
  themeRoleLabels,
  themeTokenKeys,
} from "@/lib/theme";
import { themeColors } from "@/lib/theme";
import { contrastRatio } from "@/lib/contrast";
import { defaultTokens } from "@/data/workspace";
import type { Tokens } from "@/types/workspace";

/**
 * themeColors is the function every preview surface calls first, so a bad
 * token has to stop here rather than reach render: a lookup that returns
 * undefined throws on the first property read, which drops the whole
 * workspace into the recovery screen.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("themeColors", () => {
  it("reads the light theme from the light tokens", () => {
    const colors = themeColors(defaultTokens, "light");
    expect(colors.background).toBe(defaultTokens.paper);
    expect(colors.foreground).toBe(defaultTokens.ink);
  });

  it("reads the dark theme from the dark tokens", () => {
    const colors = themeColors(defaultTokens, "dark");
    expect(colors.background).toBe(defaultTokens.darkPaper);
    expect(colors.accent).toBe(defaultTokens.darkAccent);
  });

  it.each([
    ["a named colour", "rebeccapurple"],
    ["a three-digit hex", "#abc"],
    ["an eight-digit hex", "#aabbccdd"],
    ["an rgb() function", "rgb(1,2,3)"],
    ["an empty string", ""],
    ["a hex with no hash", "aabbcc"],
    ["trailing whitespace", "#aabbcc "],
  ])("falls back to the default for %s", (_label, value) => {
    const colors = themeColors({ ...defaultTokens, darkPaper: value } as Tokens, "dark");
    expect(colors.background).toBe(defaultTokens.darkPaper);
  });

  it.each([undefined, null, 42, {}, []])(
    "falls back to the default for a non-string token (%s)",
    (value) => {
      const colors = themeColors(
        { ...defaultTokens, darkInk: value } as unknown as Tokens,
        "dark",
      );
      expect(colors.foreground).toBe(defaultTokens.darkInk);
    },
  );

  it("never returns undefined for any role, whatever the tokens hold", () => {
    const broken = Object.fromEntries(
      Object.keys(defaultTokens).map((key) => [key, undefined]),
    ) as unknown as Tokens;
    for (const mode of ["light", "dark"] as const) {
      const colors = themeColors(broken, mode);
      for (const value of Object.values(colors)) {
        expect(typeof value).toBe("string");
        expect(value).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("accepts uppercase hex, which an import or a paste will produce", () => {
    const colors = themeColors({ ...defaultTokens, darkPaper: "#AABBCC" } as Tokens, "dark");
    expect(colors.background).toBe("#AABBCC");
  });
});

describe("themeTokenKeys and themeRoleLabels", () => {
  it("map the same set of roles, so no role renders without a label", () => {
    const roles = Object.keys(themeRoleLabels).sort();
    expect(Object.keys(themeTokenKeys.light).sort()).toEqual(roles);
    expect(Object.keys(themeTokenKeys.dark).sort()).toEqual(roles);
  });

  it("point at tokens that exist", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const key of Object.values(themeTokenKeys[mode])) {
        expect(defaultTokens).toHaveProperty(key);
      }
    }
  });
});

describe("onAccent", () => {
  it("picks the neutral that reads better on the accent", () => {
    const colors = {
      background: "#ffffff",
      foreground: "#000000",
      muted: "#777777",
      line: "#cccccc",
      accent: "#222222",
      accentSoft: "#eeeeee",
    };
    // White on near-black beats black on near-black.
    expect(onAccent(colors)).toBe("#ffffff");
  });

  it("picks the other way round on a light accent", () => {
    const colors = {
      background: "#111111",
      foreground: "#ffffff",
      muted: "#777777",
      line: "#333333",
      accent: "#f6f6f6",
      accentSoft: "#222222",
    };
    expect(onAccent(colors)).toBe("#111111");
  });

  it("returns a usable colour when both neutrals are identical", () => {
    const colors = {
      background: "#808080",
      foreground: "#808080",
      muted: "#808080",
      line: "#808080",
      accent: "#808080",
      accentSoft: "#808080",
    };
    // No winner exists; it must still answer with one of them, not undefined.
    expect(onAccent(colors)).toBe("#808080");
  });
});

describe("deriveDarkTheme", () => {
  it("produces a dark background and a light foreground", () => {
    const derived = deriveDarkTheme(defaultTokens);
    const bg = contrastRatio("#000000", derived.darkPaper as string);
    const fg = contrastRatio("#000000", derived.darkInk as string);
    expect(bg).toBeLessThan(fg);
  });

  it("returns readable text on the derived background", () => {
    const derived = deriveDarkTheme(defaultTokens);
    expect(
      contrastRatio(derived.darkInk as string, derived.darkPaper as string),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("returns only the six dark tokens, so it cannot disturb the light theme", () => {
    expect(Object.keys(deriveDarkTheme(defaultTokens)).sort()).toEqual([
      "darkAccent",
      "darkAccentSoft",
      "darkInk",
      "darkLine",
      "darkMuted",
      "darkPaper",
    ]);
  });

  it("returns valid hex even from an achromatic source", () => {
    const derived = deriveDarkTheme({
      ...defaultTokens,
      paper: "#ffffff",
      ink: "#000000",
      muted: "#808080",
      line: "#cccccc",
      accent: "#000000",
      accentSoft: "#ffffff",
    });
    for (const value of Object.values(derived)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("is stable: deriving twice from the same tokens gives the same result", () => {
    expect(deriveDarkTheme(defaultTokens)).toEqual(deriveDarkTheme(defaultTokens));
  });
});

describe("resolveMode", () => {
  it("returns an explicit preference untouched", () => {
    expect(resolveMode("dark")).toBe("dark");
    expect(resolveMode("light")).toBe("light");
  });

  it("falls back to dark when there is no window (server render)", () => {
    vi.stubGlobal("window", undefined);
    expect(resolveMode("system")).toBe("dark");
  });

  it("falls back to dark when matchMedia is missing", () => {
    // Older browsers and some embedded webviews have no matchMedia; reading
    // `.matches` off undefined would throw during the first render.
    vi.stubGlobal("window", {});
    expect(resolveMode("system")).toBe("dark");
  });

  it("follows the system preference when it can be read", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(resolveMode("system")).toBe("light");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(resolveMode("system")).toBe("dark");
  });
});
