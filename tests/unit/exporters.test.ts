import { describe, expect, it } from "vitest";
import { defaultTokens } from "@/data/workspace";
import { buildExports } from "@/lib/exporters";
import type { Snapshot, Tokens } from "@/types/workspace";

const build = (overrides: Partial<Tokens> = {}, extra: Partial<Parameters<typeof buildExports>[0]> = {}) =>
  buildExports({
    tokens: { ...defaultTokens, ...overrides },
    starter: "Editorial",
    mode: "light",
    projectId: "proj-1",
    projectName: "My Project",
    snapshots: [],
    ...extra,
  });

/** Every `{`/`}` is balanced, ignoring comments. */
function balanced(css: string) {
  let depth = 0;
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/** Parse `--name: value;` declarations from a block of CSS. */
function declarations(css: string) {
  return Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

/** The light-theme `:root { ... }` block only; later dark blocks reuse the same variable names. */
const rootBlock = (css: string) => css.slice(0, css.indexOf(':root[data-theme="dark"]'));

describe("buildExports result shape", () => {
  it("returns all seven outputs as non-empty strings", () => {
    const files = build();
    expect(Object.keys(files).sort()).toEqual(["css", "design", "dtcg", "json", "project", "shadcn", "tailwind"]);
    for (const value of Object.values(files)) expect(value.length).toBeGreaterThan(0);
  });
});

describe("css export", () => {
  const { css } = build();

  it("starts with a comment naming the starter and has balanced braces", () => {
    expect(css.startsWith("/* CHROMIQ export: Editorial */")).toBe(true);
    expect(balanced(css)).toBe(true);
  });

  it("declares the light theme in :root and the dark theme under the three dark selectors", () => {
    expect(css).toContain(":root {");
    expect(css).toContain(':root[data-theme="dark"],\n.dark {');
    expect(css).toContain("@media (prefers-color-scheme: dark) {");
    expect(css).toContain(':root:not([data-theme="light"]) {');
  });

  it("writes the light and dark colors from the tokens", () => {
    const [root, dark] = css.split(':root[data-theme="dark"]');
    expect(root).toContain(`--chromiq-bg: ${defaultTokens.paper};`);
    expect(root).toContain(`--chromiq-fg: ${defaultTokens.ink};`);
    expect(root).toContain(`--chromiq-accent: ${defaultTokens.accent};`);
    expect(dark).toContain(`--chromiq-bg: ${defaultTokens.darkPaper};`);
    expect(dark).toContain(`--chromiq-fg: ${defaultTokens.darkInk};`);
    expect(dark).toContain(`--chromiq-accent: ${defaultTokens.darkAccent};`);
  });

  it("writes shared variables with units", () => {
    const vars = declarations(rootBlock(css));
    expect(vars["--chromiq-radius"]).toBe("12px");
    expect(vars["--chromiq-space"]).toBe("8px");
    expect(vars["--chromiq-motion"]).toBe("200ms");
    expect(vars["--chromiq-tracking"]).toBe("-0.09em");
    expect(vars["--chromiq-line-height"]).toBe("1.55");
    expect(vars["--chromiq-border"]).toBe("1px");
    expect(vars["--chromiq-breakpoint-md"]).toBe("768px");
    expect(vars["--chromiq-font-display"]).toBe('"Space Grotesk"');
  });

  it("includes the 11-step accent ramp, the type scale and the spacing scale", () => {
    const vars = declarations(rootBlock(css));
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950])
      expect(vars[`--chromiq-accent-${step}`]).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars["--chromiq-text-base"]).toBe("1rem");
    expect(vars["--chromiq-text-lg"]).toBe("1.25rem");
    expect(vars["--chromiq-space-0-5"]).toBe("4px");
    expect(vars["--chromiq-space-16"]).toBe("128px");
  });

  it("every color declaration is a valid #rrggbb", () => {
    for (const [name, value] of Object.entries(declarations(css)))
      if (/(bg|fg|muted|line|accent(-soft)?|on-accent|success|warning|danger|accent-\d+)$/.test(name))
        expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("chooses the on-accent label color with enough contrast", () => {
    // Default light accent #5f6e1f is dark, so the label must be the (light) paper color.
    expect(declarations(rootBlock(css))["--chromiq-on-accent"]).toBe(defaultTokens.paper);
    // Dark accent #b7cc6a is light, so the dark label flips to the dark paper.
    expect(css.slice(css.indexOf('[data-theme="dark"]'))).toContain(`--chromiq-on-accent: ${defaultTokens.darkPaper};`);
  });
});

describe("tailwind export", () => {
  const { tailwind } = build();

  it("is a Tailwind v4 file with an @theme inline block and balanced braces", () => {
    expect(tailwind.startsWith("/* Tailwind CSS v4 */")).toBe(true);
    expect(tailwind).toContain("@theme inline {");
    expect(balanced(tailwind)).toBe(true);
  });

  it("maps theme colors to the CSS variables and inlines state colors", () => {
    const vars = declarations(tailwind.slice(tailwind.indexOf("@theme inline")));
    expect(vars["--color-chromiq-bg"]).toBe("var(--chromiq-bg)");
    expect(vars["--color-chromiq-accent"]).toBe("var(--chromiq-accent)");
    expect(vars["--color-chromiq-success"]).toBe(defaultTokens.success);
    expect(vars["--spacing-chromiq"]).toBe("8px");
    expect(vars["--radius-chromiq"]).toBe("12px");
    expect(vars["--breakpoint-lg"]).toBe("1024px");
    expect(vars["--text-chromiq-base"]).toBe("1rem");
  });

  it("does not repeat the shared variable block outside @theme", () => {
    expect(tailwind.slice(0, tailwind.indexOf("@theme"))).not.toContain("--chromiq-radius");
  });
});

describe("shadcn export", () => {
  const { shadcn } = build();

  it("defines :root and .dark blocks with balanced braces", () => {
    expect(shadcn.startsWith(":root {")).toBe(true);
    expect(shadcn).toContain("\n.dark {");
    expect(balanced(shadcn)).toBe(true);
  });

  it("provides the standard shadcn variables in both themes", () => {
    const [root, dark] = shadcn.split("\n.dark {");
    for (const block of [root, dark])
      for (const name of [
        "--background",
        "--foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--card",
        "--popover",
        "--accent",
        "--muted",
        "--muted-foreground",
        "--border",
        "--input",
        "--ring",
      ])
        expect(declarations(block)[name], name).toMatch(/^#[0-9a-f]{6}$/);
    expect(declarations(root)["--background"]).toBe(defaultTokens.paper);
    expect(declarations(dark)["--background"]).toBe(defaultTokens.darkPaper);
    expect(declarations(root)["--primary"]).toBe(defaultTokens.accent);
    expect(declarations(dark)["--primary"]).toBe(defaultTokens.darkAccent);
  });

  it("carries radius, destructive and status colors only in :root", () => {
    const [root, dark] = shadcn.split("\n.dark {");
    expect(declarations(root)["--radius"]).toBe("12px");
    expect(declarations(root)["--destructive"]).toBe(defaultTokens.danger);
    expect(dark).not.toContain("--radius");
  });
});

describe("json export", () => {
  it("is parseable v2 JSON carrying the original tokens", () => {
    const parsed = JSON.parse(build().json);
    expect(parsed.version).toBe(2);
    expect(parsed.name).toBe("Editorial");
    expect(parsed.tokens).toEqual(defaultTokens);
  });
});

describe("project export", () => {
  it("wraps id, name, mode, starter, tokens and snapshots", () => {
    const snapshot: Snapshot = {
      id: "s1",
      name: "Before",
      createdAt: "2026-01-01T00:00:00.000Z",
      tokens: defaultTokens,
      mode: "dark",
      starter: "Editorial",
    };
    const parsed = JSON.parse(build({}, { snapshots: [snapshot], mode: "dark" }).project);
    expect(parsed).toMatchObject({ version: 1, type: "chromiq-project" });
    expect(parsed.project).toMatchObject({ id: "proj-1", name: "My Project", mode: "dark", starter: "Editorial" });
    expect(parsed.project.tokens).toEqual(defaultTokens);
    expect(parsed.project.snapshots).toEqual([snapshot]);
  });
});

describe("dtcg export", () => {
  const dtcg = JSON.parse(build().dtcg);

  it("is valid JSON where every leaf has $type and $value", () => {
    const leaves: Array<{ path: string; node: Record<string, unknown> }> = [];
    const walk = (node: Record<string, unknown>, path: string) => {
      if ("$value" in node) return leaves.push({ path, node });
      for (const [key, child] of Object.entries(node))
        if (key !== "$description") walk(child as Record<string, unknown>, `${path}.${key}`);
    };
    walk(dtcg, "");
    expect(leaves.length).toBeGreaterThan(50);
    for (const { path, node } of leaves) {
      expect(node.$type, path).toEqual(expect.any(String));
      expect(node.$value, path).toBeDefined();
    }
  });

  it("has light and dark color roles that match the tokens", () => {
    expect(dtcg.color.light.background).toEqual({ $type: "color", $value: defaultTokens.paper });
    expect(dtcg.color.dark.foreground).toEqual({ $type: "color", $value: defaultTokens.darkInk });
    expect(dtcg.color.light["accent-soft"].$value).toBe(defaultTokens.accentSoft);
    expect(dtcg.color.state.danger.$value).toBe(defaultTokens.danger);
    expect(Object.keys(dtcg.color.accent)).toHaveLength(11);
  });

  it("types fonts, dimensions, durations and numbers correctly", () => {
    expect(dtcg.font.display).toEqual({ $type: "fontFamily", $value: ["Space Grotesk", "sans-serif"] });
    expect(dtcg.font.mono.$value).toEqual(["IBM Plex Mono", "monospace"]);
    expect(dtcg.dimension.radius).toEqual({ $type: "dimension", $value: "12px" });
    expect(dtcg.dimension.space["0-5"].$value).toBe("4px");
    expect(dtcg.dimension.space["16"].$value).toBe("128px");
    expect(dtcg["font-size"].base.$value).toBe("1rem");
    expect(dtcg.duration.motion).toEqual({ $type: "duration", $value: "200ms" });
    expect(dtcg.number["line-height"]).toEqual({ $type: "number", $value: 1.55 });
    expect(dtcg.number["type-ratio"].$value).toBe(1.25);
  });

  it("mentions the starter in its description", () => {
    expect(dtcg.$description).toContain("CHROMIQ export: Editorial");
  });
});

describe("design (DESIGN.md) export", () => {
  it("contains the color-role table and the token list", () => {
    const { design } = build();
    expect(design.startsWith("# Editorial\n")).toBe(true);
    expect(design).toContain("| Role | Light | Dark |");
    expect(design).toContain(`| Background | ${defaultTokens.paper} | ${defaultTokens.darkPaper} |`);
    expect(design).toContain(`| Accent soft | ${defaultTokens.accentSoft} | ${defaultTokens.darkAccentSoft} |`);
    expect(design).toContain("- Radius: 12px");
    expect(design).toContain("- Breakpoints: 640/768/1024px");
    expect(design).toContain("The light theme is the current working preview.");
  });

  it("reports passing contrast for the defaults", () => {
    expect(build().design).toContain("All checked light and dark pairs meet their minimum contrast.");
  });

  it("lists failing pairs with their ratio and minimum", () => {
    const { design } = build({ ink: defaultTokens.paper });
    expect(design).toContain("- Light theme: Text on background (ink) is 1:1, needs 4.5:1");
    expect(design).not.toContain("All checked light and dark pairs");
  });

  it("reflects the working mode", () => {
    expect(build({}, { mode: "dark" }).design).toContain("The dark theme is the current working preview.");
  });
});

describe("sanitisation of untrusted tokens", () => {
  it("replaces malformed colors with the defaults in every CSS-like output", () => {
    const files = build({ accent: "red; } body { display:none", paper: "#xyz" } as Partial<Tokens>);
    for (const text of [files.css, files.tailwind, files.shadcn, files.design, files.dtcg]) {
      expect(text).not.toContain("display:none");
      expect(text).not.toContain("#xyz");
    }
    expect(declarations(rootBlock(files.css))["--chromiq-accent"]).toBe(defaultTokens.accent);
    expect(declarations(rootBlock(files.css))["--chromiq-bg"]).toBe(defaultTokens.paper);
    expect(balanced(files.css)).toBe(true);
  });

  it("strips quotes, braces and semicolons from font names and falls back when empty", () => {
    const files = build({ displayFont: 'Evil";} body{x:y} /*', bodyFont: '"";{}' } as Partial<Tokens>);
    const vars = declarations(rootBlock(files.css));
    expect(vars["--chromiq-font-display"]).toBe('"Evil bodyx:y /*"');
    expect(vars["--chromiq-font-body"]).toBe(`"${defaultTokens.bodyFont}"`);
    expect(balanced(files.css)).toBe(true);
  });

  it("falls back to default numbers for NaN, Infinity and non-numbers", () => {
    const files = build({ radius: NaN, spacing: Infinity, motion: "fast" as unknown as number });
    const vars = declarations(rootBlock(files.css));
    expect(vars["--chromiq-radius"]).toBe("12px");
    expect(vars["--chromiq-space"]).toBe("8px");
    expect(vars["--chromiq-motion"]).toBe("200ms");
    expect(files.css).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("removes comment terminators and newlines from the starter name", () => {
    const files = build({}, { starter: "Bad */ name\nnext /* x" });
    const firstLine = files.css.split("\n")[0];
    expect(firstLine).toBe("/* CHROMIQ export: Bad  name next  x */");
    expect(files.design.split("\n")[0]).not.toMatch(/\*\/|\/\*/);
    expect(files.css.slice(2)).not.toContain("*/ name");
  });

  it("falls back to CHROMIQ when the starter is empty after cleaning", () => {
    expect(build({}, { starter: "*/" }).css.split("\n")[0]).toBe("/* CHROMIQ export: CHROMIQ */");
  });
});
