import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import { buildExports } from "@/lib/exporters";
import { importCss, importJson, importTailwind } from "@/lib/importers";

describe("importCss", () => {
  it("maps CHROMIQ variables to light tokens and parses numeric ones", () => {
    const { tokens, warnings } = importCss(`:root {
      --chromiq-accent: #112233;
      --chromiq-accent-soft: #aabbcc;
      --chromiq-bg: #fafafa;
      --chromiq-fg: #101010;
      --chromiq-muted: #777777;
      --chromiq-line: #dddddd;
      --chromiq-radius: 10px;
      --chromiq-space: 6px;
    }`);
    expect(tokens).toEqual({
      accent: "#112233",
      accentSoft: "#aabbcc",
      paper: "#fafafa",
      ink: "#101010",
      muted: "#777777",
      line: "#dddddd",
      radius: 10,
      spacing: 6,
    });
    expect(warnings).toEqual([]);
  });

  it("accepts the --chromiq-paper and --chromiq-ink aliases", () => {
    expect(importCss(":root{--chromiq-paper:#ffffff;--chromiq-ink:#000000}").tokens).toEqual({
      paper: "#ffffff",
      ink: "#000000",
    });
  });

  it("parses fractional and rem-suffixed lengths with parseFloat", () => {
    expect(importCss(":root{--chromiq-radius: 7.5px; --chromiq-space: 0.5rem}").tokens).toEqual({
      radius: 7.5,
      spacing: 0.5,
    });
  });

  describe("dark theme detection", () => {
    it.each([
      [".dark { --chromiq-bg: #000000; }"],
      [':root[data-theme="dark"] { --chromiq-bg: #000000; }'],
      [":root[data-theme=dark] { --chromiq-bg: #000000; }"],
      ['[data-color-mode="dark"] { --chromiq-bg: #000000; }'],
      ["@media (prefers-color-scheme: dark) { :root { --chromiq-bg: #000000; } }"],
      ['@media (prefers-color-scheme:dark) { :root:not([data-theme="light"]) { --chromiq-bg: #000000; } }'],
      [':root[data-theme="dark"],\n.dark { --chromiq-bg: #000000; }'],
    ])("routes declarations in %j to the dark tokens", (css) => {
      expect(importCss(css).tokens).toEqual({ darkPaper: "#000000" });
    });

    it("maps every themed role to its dark counterpart", () => {
      const { tokens } = importCss(`.dark {
        --chromiq-accent: #010101; --chromiq-accent-soft: #020202; --chromiq-bg: #030303;
        --chromiq-fg: #040404; --chromiq-muted: #050505; --chromiq-line: #060606;
      }`);
      expect(tokens).toEqual({
        darkAccent: "#010101",
        darkAccentSoft: "#020202",
        darkPaper: "#030303",
        darkInk: "#040404",
        darkMuted: "#050505",
        darkLine: "#060606",
      });
    });

    it("treats :not(.dark) and light media queries as light", () => {
      expect(importCss(":root:not(.dark) { --chromiq-bg: #ffffff; }").tokens).toEqual({ paper: "#ffffff" });
      expect(importCss("@media (prefers-color-scheme: light) { :root { --chromiq-bg: #ffffff; } }").tokens).toEqual({
        paper: "#ffffff",
      });
      expect(importCss("@media (min-width: 600px) { :root { --chromiq-bg: #ffffff; } }").tokens).toEqual({
        paper: "#ffffff",
      });
    });

    it("keeps light and dark values apart in one file", () => {
      const { tokens } = importCss(`:root { --chromiq-bg: #ffffff; } .dark { --chromiq-bg: #000000; } :root { --chromiq-fg: #111111; }`);
      expect(tokens).toEqual({ paper: "#ffffff", darkPaper: "#000000", ink: "#111111" });
    });

    it("leaves radius and spacing as shared tokens even inside a dark block", () => {
      expect(importCss(".dark { --chromiq-radius: 3px; }").tokens).toEqual({ radius: 3 });
    });
  });

  describe("warnings", () => {
    it("skips unsupported variables with a named warning", () => {
      const { tokens, warnings } = importCss(":root{--brand: #123456; --chromiq-accent: #654321}");
      expect(tokens).toEqual({ accent: "#654321" });
      expect(warnings).toEqual(["Skipped unsupported variable --brand."]);
    });

    it("silently ignores derived variables (on-accent, ramp, type and spacing scale)", () => {
      const { tokens, warnings } = importCss(`:root {
        --chromiq-on-accent: #ffffff; --chromiq-accent-500: #123456; --chromiq-text-base: 1rem;
        --chromiq-space-0-5: 4px; --chromiq-space: 8px;
      }`);
      expect(warnings).toEqual([]);
      expect(tokens).toEqual({ spacing: 8 });
    });

    it("warns when a length cannot be parsed and keeps nothing for it", () => {
      const { tokens, warnings } = importCss(":root{--chromiq-radius: big; --chromiq-space: auto}");
      expect(tokens).toEqual({});
      expect(warnings).toEqual([
        "Could not parse --chromiq-radius.",
        "Could not parse --chromiq-space.",
        "No CHROMIQ or compatible token variables were found.",
      ]);
    });

    it("warns when nothing usable is found", () => {
      for (const source of ["", "   ", "body { color: red }", "not css at all"]) {
        const { tokens, warnings } = importCss(source);
        expect(tokens).toEqual({});
        expect(warnings).toEqual(["No CHROMIQ or compatible token variables were found."]);
      }
    });

    it("does not add the empty warning when only unsupported variables were skipped but some token parsed", () => {
      const { warnings } = importCss(":root{--other: 1; --chromiq-bg: #fff}");
      expect(warnings).not.toContain("No CHROMIQ or compatible token variables were found.");
    });
  });

  describe("robustness", () => {
    it("ignores variables inside comments", () => {
      const { tokens } = importCss("/* --chromiq-bg: #000000; */ :root { --chromiq-fg: #111111; /* --chromiq-line: #222222 */ }");
      expect(tokens).toEqual({ ink: "#111111" });
    });

    it("lets the last declaration win", () => {
      expect(importCss(":root{--chromiq-bg:#111111;--chromiq-bg:#222222}").tokens).toEqual({ paper: "#222222" });
    });

    it("tolerates whitespace, newlines and a missing trailing semicolon", () => {
      expect(importCss(":root\n{\n  --chromiq-bg  :   #123456\n}").tokens).toEqual({ paper: "#123456" });
    });

    it("tolerates unbalanced braces without throwing", () => {
      expect(() => importCss("}}} :root { --chromiq-bg: #fff")).not.toThrow();
      expect(() => importCss("{{{{")).not.toThrow();
      expect(importCss(":root { --chromiq-bg: #ffffff").tokens).toEqual({ paper: "#ffffff" });
    });

    it("does not validate colors: values are passed through trimmed", () => {
      // Validation happens later (validateTokens / safeTokens); the importer only maps.
      expect(importCss(":root{--chromiq-accent:  rebeccapurple }").tokens).toEqual({ accent: "rebeccapurple" });
    });
  });

  it("round-trips a CHROMIQ CSS export back to the original tokens", () => {
    const { css } = buildExports({
      tokens: defaultTokens,
      starter: "Editorial",
      mode: "light",
      projectId: "p",
      projectName: "P",
      snapshots: [],
    });
    const { tokens, warnings } = importCss(css);
    expect(tokens).toEqual({
      paper: defaultTokens.paper,
      ink: defaultTokens.ink,
      muted: defaultTokens.muted,
      line: defaultTokens.line,
      accent: defaultTokens.accent,
      accentSoft: defaultTokens.accentSoft,
      darkPaper: defaultTokens.darkPaper,
      darkInk: defaultTokens.darkInk,
      darkMuted: defaultTokens.darkMuted,
      darkLine: defaultTokens.darkLine,
      darkAccent: defaultTokens.darkAccent,
      darkAccentSoft: defaultTokens.darkAccentSoft,
      radius: defaultTokens.radius,
      spacing: defaultTokens.spacing,
    });
    // fonts, status colors, tracking, ... are exported but have no import mapping.
    expect(warnings).toContain("Skipped unsupported variable --chromiq-font-display.");
    expect(warnings).toContain("Skipped unsupported variable --chromiq-success.");
    expect(warnings.some((w) => /on-accent|accent-\d/.test(w))).toBe(false);
  });
});

describe("importJson", () => {
  it("reads a CHROMIQ export wrapper ({ version, name, tokens })", () => {
    const { tokens, warnings } = importJson(JSON.stringify({ version: 2, name: "X", tokens: defaultTokens }));
    expect(tokens).toEqual(defaultTokens);
    expect(warnings).toEqual([]);
  });

  it("reads a { theme } wrapper", () => {
    expect(importJson('{"theme": {"accent": "#123456"}}').tokens).toEqual({ accent: "#123456" });
  });

  it("reads a flat token object and silently skips version/name/type", () => {
    const { tokens, warnings } = importJson('{"version": 1, "name": "n", "type": "t", "radius": 4}');
    expect(tokens).toEqual({ radius: 4 });
    expect(warnings).toEqual([]);
  });

  it("does not skip version/name/type when they are inside the tokens wrapper", () => {
    const { warnings } = importJson('{"tokens": {"version": 1, "radius": 2}}');
    expect(warnings).toEqual(["Ignored unknown token version."]);
  });

  it("round-trips the json export", () => {
    const { json } = buildExports({
      tokens: defaultTokens,
      starter: "S",
      mode: "dark",
      projectId: "p",
      projectName: "P",
      snapshots: [],
    });
    expect(importJson(json)).toEqual({ tokens: defaultTokens, warnings: [] });
  });

  it("ignores unknown keys with a warning but keeps valid ones", () => {
    const { tokens, warnings } = importJson('{"accent": "#112233", "wibble": 1, "__proto__x": 2}');
    expect(tokens).toEqual({ accent: "#112233" });
    expect(warnings).toEqual(["Ignored unknown token wibble.", "Ignored unknown token __proto__x."]);
  });

  it("rejects values of the wrong type, naming the expected type", () => {
    const { tokens, warnings } = importJson('{"radius": "12", "accent": 5, "motion": null, "shadow": true}');
    expect(tokens).toEqual({});
    expect(warnings).toEqual([
      "Ignored radius: expected a number.",
      "Ignored accent: expected a string.",
      "Ignored motion: expected a number.",
      "Ignored shadow: expected a number.",
      "No supported token keys were found in this JSON file.",
    ]);
  });

  it("does not range-check numbers or color strings", () => {
    expect(importJson('{"radius": -3, "accent": "nope"}').tokens).toEqual({ radius: -3, accent: "nope" });
  });

  it("reports a parse failure for malformed JSON", () => {
    for (const bad of ["", "{", "{'accent': '#fff'}", "undefined", '{"a":1,}']) {
      expect(importJson(bad)).toEqual({ tokens: {}, warnings: ["The JSON could not be parsed."] });
    }
  });

  it("reports a parse failure for JSON null and warns about empty or non-object JSON", () => {
    expect(importJson("null")).toEqual({ tokens: {}, warnings: ["The JSON could not be parsed."] });
    expect(importJson("{}")).toEqual({
      tokens: {},
      warnings: ["No supported token keys were found in this JSON file."],
    });
    expect(importJson("42")).toEqual({
      tokens: {},
      warnings: ["No supported token keys were found in this JSON file."],
    });
  });

  it("flags a project export as not a token file (its keys are unknown tokens)", () => {
    const { project } = buildExports({
      tokens: defaultTokens,
      starter: "S",
      mode: "dark",
      projectId: "p",
      projectName: "P",
      snapshots: [],
    });
    const result = importJson(project);
    expect(result.tokens).toEqual({});
    expect(result.warnings).toContain("Ignored unknown token project.");
    expect(result.warnings).toContain("No supported token keys were found in this JSON file.");
  });
});

describe("importTailwind", () => {
  it("reuses CSS variable import", () => {
    const { tokens } = importTailwind("@theme { } :root { --chromiq-accent: #123456; }");
    expect(tokens.accent).toBe("#123456");
  });

  it("reads explicit borderRadius and spacing from config-style source", () => {
    const { tokens, warnings } = importTailwind(`theme: { borderRadius: "8px", spacing: '4px' }`);
    expect(tokens).toEqual({ radius: 8, spacing: 4 });
    expect(warnings).toEqual(["No CHROMIQ or compatible token variables were found."]);
  });

  it("accepts '=' and unquoted fractional values", () => {
    expect(importTailwind("borderRadius = 6.5px; spacing=2px").tokens).toEqual({ radius: 6.5, spacing: 2 });
  });

  it("lets explicit config values override CSS variables", () => {
    const { tokens } = importTailwind(`:root { --chromiq-radius: 20px; }\nborderRadius: "5px"`);
    expect(tokens.radius).toBe(5);
  });

  it("warns when neither radius nor spacing is explicit, and keeps CSS warnings", () => {
    const { tokens, warnings } = importTailwind(":root { --other: 1; --chromiq-bg: #ffffff; }");
    expect(tokens).toEqual({ paper: "#ffffff" });
    expect(warnings).toEqual([
      "Skipped unsupported variable --other.",
      "No explicit Tailwind radius or spacing values were found.",
    ]);
  });

  it("does not add the explicit-values warning when only one of them is found", () => {
    const { warnings } = importTailwind('spacing: "4px"');
    expect(warnings).not.toContain("No explicit Tailwind radius or spacing values were found.");
  });

  it("returns both empty-input warnings for an empty string", () => {
    expect(importTailwind("")).toEqual({
      tokens: {},
      warnings: [
        "No CHROMIQ or compatible token variables were found.",
        "No explicit Tailwind radius or spacing values were found.",
      ],
    });
  });

  it("round-trips the tailwind export for color tokens", () => {
    const { tailwind } = buildExports({
      tokens: defaultTokens,
      starter: "S",
      mode: "light",
      projectId: "p",
      projectName: "P",
      snapshots: [],
    });
    const { tokens } = importTailwind(tailwind);
    expect(tokens.paper).toBe(defaultTokens.paper);
    expect(tokens.darkPaper).toBe(defaultTokens.darkPaper);
    expect(tokens.accent).toBe(defaultTokens.accent);
  });
});
