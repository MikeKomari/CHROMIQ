import { defaultTokens } from "@/data/workspace";
import { contrastRatio, failingPairs } from "@/lib/contrast";
import { onAccent, themeColors, themeRoleLabels } from "@/lib/theme";
import type { Mode, Snapshot, ThemeColors, Tokens } from "@/types/workspace";

export type ExportFiles = {
  css: string;
  tailwind: string;
  shadcn: string;
  design: string;
  json: string;
  project: string;
};

type ExportInput = {
  tokens: Tokens;
  starter: string;
  mode: Mode;
  projectId: string;
  projectName: string;
  snapshots: Snapshot[];
};

const HEX6 = /^#[0-9a-f]{6}$/i;

/** Tokens that are about to be written into CSS/Markdown: colors must be #rrggbb, fonts plain names, numbers finite. */
function safeTokens(tokens: Tokens): Tokens {
  const out = { ...tokens } as Record<string, string | number>;
  for (const key of Object.keys(defaultTokens) as (keyof Tokens)[]) {
    const fallback = defaultTokens[key];
    const value = tokens[key] as unknown;
    if (typeof fallback === "number") {
      out[key] = typeof value === "number" && Number.isFinite(value) ? value : fallback;
    } else if (/Font$/.test(key)) {
      const name = typeof value === "string" ? value.replace(/["'`;{}\\\r\n<>]/g, "").trim().slice(0, 80) : "";
      out[key] = name || fallback;
    } else {
      out[key] = typeof value === "string" && HEX6.test(value) ? value : fallback;
    }
  }
  return out as Tokens;
}

/** A starter name used inside a CSS comment or Markdown heading: single line, no comment terminator. */
const safeName = (name: string) => name.replace(/\*\/|\/\*/g, "").replace(/[\r\n\u2028\u2029]+/g, " ").trim() || "PRISM";

const indent = (lines: string[], spaces = 2) =>
  lines.map((line) => `${" ".repeat(spaces)}${line}`).join("\n");

function colorVars(colors: ThemeColors) {
  return [
    `--prism-bg: ${colors.background};`,
    `--prism-fg: ${colors.foreground};`,
    `--prism-muted: ${colors.muted};`,
    `--prism-line: ${colors.line};`,
    `--prism-accent: ${colors.accent};`,
    `--prism-accent-soft: ${colors.accentSoft};`,
    `--prism-on-accent: ${onAccent(colors)};`,
  ];
}

function sharedVars(tokens: Tokens) {
  return [
    `--prism-font-display: "${tokens.displayFont}";`,
    `--prism-font-body: "${tokens.bodyFont}";`,
    `--prism-font-mono: "${tokens.monoFont}";`,
    `--prism-success: ${tokens.success};`,
    `--prism-warning: ${tokens.warning};`,
    `--prism-danger: ${tokens.danger};`,
    `--prism-radius: ${tokens.radius}px;`,
    `--prism-space: ${tokens.spacing}px;`,
    `--prism-line-height: ${tokens.lineHeight};`,
    `--prism-tracking: ${tokens.tracking}em;`,
    `--prism-border: ${tokens.borderWidth}px;`,
    `--prism-shadow: ${tokens.shadow};`,
    `--prism-motion: ${tokens.motion}ms;`,
    `--prism-breakpoint-sm: ${tokens.breakpointSm}px;`,
    `--prism-breakpoint-md: ${tokens.breakpointMd}px;`,
    `--prism-breakpoint-lg: ${tokens.breakpointLg}px;`,
  ];
}

function themeBlocks(tokens: Tokens, withShared: boolean) {
  const light = colorVars(themeColors(tokens, "light"));
  const dark = colorVars(themeColors(tokens, "dark"));
  return [
    `:root {\n${indent([...(withShared ? sharedVars(tokens) : []), ...light])}\n}`,
    `:root[data-theme="dark"],\n.dark {\n${indent(dark)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${indent(dark, 4)}\n  }\n}`,
  ].join("\n\n");
}

function shadcnVars(colors: ThemeColors) {
  return [
    `--background: ${colors.background};`,
    `--foreground: ${colors.foreground};`,
    `--primary: ${colors.accent};`,
    `--primary-foreground: ${onAccent(colors)};`,
    `--secondary: ${colors.accentSoft};`,
    `--secondary-foreground: ${colors.foreground};`,
    `--card: ${colors.background};`,
    `--card-foreground: ${colors.foreground};`,
    `--popover: ${colors.background};`,
    `--popover-foreground: ${colors.foreground};`,
    `--accent: ${colors.accentSoft};`,
    `--accent-foreground: ${colors.foreground};`,
    `--muted: ${colors.accentSoft};`,
    `--muted-foreground: ${colors.muted};`,
    `--border: ${colors.line};`,
    `--input: ${colors.line};`,
    `--ring: ${colors.accent};`,
  ];
}

function buildDesign({ tokens, starter, mode }: ExportInput) {
  starter = safeName(starter);
  const light = themeColors(tokens, "light");
  const dark = themeColors(tokens, "dark");
  const roles = Object.keys(themeRoleLabels) as (keyof ThemeColors)[];
  const rows = roles
    .map(
      (role) => `| ${themeRoleLabels[role]} | ${light[role]} | ${dark[role]} |`,
    )
    .join("\n");
  const failing = failingPairs(tokens);
  const contrast = failing.length
    ? failing
        .map(
          (pair) =>
            `- ${pair.theme === "light" ? "Light" : "Dark"} theme: ${pair.label} (${pair.token}) is ${contrastRatio(pair.fg, pair.bg)}:1, needs ${pair.min}:1`,
        )
        .join("\n")
    : "All checked light and dark pairs meet their minimum contrast.";
  return `# ${starter}\n\n## Visual direction\n\nA PRISM design system with light and dark themes. The ${mode} theme is the current working preview.\n\n## Color roles\n\n| Role | Light | Dark |\n| --- | --- | --- |\n${rows}\n\n## Contrast summary\n\n${contrast}\n\n## Tokens\n\n- Success: ${tokens.success}\n- Warning: ${tokens.warning}\n- Danger: ${tokens.danger}\n- Display font: ${tokens.displayFont}\n- Body font: ${tokens.bodyFont}\n- Mono font: ${tokens.monoFont}\n- Line height: ${tokens.lineHeight}\n- Tracking: ${tokens.tracking}em\n- Border: ${tokens.borderWidth}px\n- Shadow: ${tokens.shadow}\n- Motion: ${tokens.motion}ms\n- Breakpoints: ${tokens.breakpointSm}/${tokens.breakpointMd}/${tokens.breakpointLg}px\n- Radius: ${tokens.radius}px\n- Spacing unit: ${tokens.spacing}px\n- Display scale: ${tokens.typeScale}x\n\n## Usage\n\nUse semantic tokens instead of hardcoded values. Every color role has a light and a dark value, so components should read the role and let the theme choose.`;
}

export function buildExports(input: ExportInput): ExportFiles {
  const { starter, projectId, projectName, snapshots, mode } = input;
  const tokens = safeTokens(input.tokens);
  const css = `/* PRISM export: ${safeName(starter)} */\n${themeBlocks(tokens, true)}`;

  const tailwind = `/* Tailwind CSS v4 */\n${themeBlocks(tokens, false)}\n\n@theme inline {\n${indent(
    [
      "--color-prism-bg: var(--prism-bg);",
      "--color-prism-fg: var(--prism-fg);",
      "--color-prism-muted: var(--prism-muted);",
      "--color-prism-line: var(--prism-line);",
      "--color-prism-accent: var(--prism-accent);",
      "--color-prism-accent-soft: var(--prism-accent-soft);",
      "--color-prism-on-accent: var(--prism-on-accent);",
      `--color-prism-success: ${tokens.success};`,
      `--color-prism-warning: ${tokens.warning};`,
      `--color-prism-danger: ${tokens.danger};`,
      `--radius-prism: ${tokens.radius}px;`,
      `--tracking-prism: ${tokens.tracking}em;`,
      `--leading-prism: ${tokens.lineHeight};`,
      `--border-prism: ${tokens.borderWidth}px;`,
      `--shadow-prism: ${tokens.shadow};`,
      `--breakpoint-sm: ${tokens.breakpointSm}px;`,
      `--breakpoint-md: ${tokens.breakpointMd}px;`,
      `--breakpoint-lg: ${tokens.breakpointLg}px;`,
    ],
  )}\n}`;

  const shadcn = `:root {\n${indent([
    ...shadcnVars(themeColors(tokens, "light")),
    `--success: ${tokens.success};`,
    `--warning: ${tokens.warning};`,
    `--destructive: ${tokens.danger};`,
    `--radius: ${tokens.radius}px;`,
  ])}\n}\n\n.dark {\n${indent(shadcnVars(themeColors(tokens, "dark")))}\n}`;

  const json = JSON.stringify({ version: 2, name: starter, tokens: input.tokens }, null, 2);
  const project = JSON.stringify(
    {
      version: 1,
      type: "prism-project",
      project: {
        id: projectId,
        name: projectName,
        mode,
        starter,
        tokens: input.tokens,
        snapshots,
      },
    },
    null,
    2,
  );

  return { css, tailwind, shadcn, design: buildDesign({ ...input, tokens }), json, project };
}
