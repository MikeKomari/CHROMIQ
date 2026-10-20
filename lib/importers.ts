import { defaultTokens } from "@/data/workspace";
import type { ImportResult, Tokens } from "@/types/workspace";

const tokenMap: Record<string, keyof Tokens> = {
  "--prism-accent": "accent",
  "--prism-accent-soft": "accentSoft",
  "--prism-bg": "paper",
  "--prism-paper": "paper",
  "--prism-fg": "ink",
  "--prism-ink": "ink",
  "--prism-muted": "muted",
  "--prism-line": "line",
  "--prism-radius": "radius",
  "--prism-space": "spacing",
};

/** Exported by PRISM but derived from other tokens, so there is nothing to import. */
const derivedVariables = new Set(["--prism-on-accent"]);

const darkKeys: Partial<Record<keyof Tokens, keyof Tokens>> = {
  accent: "darkAccent",
  accentSoft: "darkAccentSoft",
  ink: "darkInk",
  paper: "darkPaper",
  muted: "darkMuted",
  line: "darkLine",
};

/** Whether a rule prelude targets the dark theme: a dark class/attribute selector, or a prefers-color-scheme: dark media query. */
function isDarkPrelude(prelude: string) {
  const text = prelude.trim();
  if (/^@media\b/i.test(text)) return /prefers-color-scheme\s*:\s*dark/i.test(text);
  if (text.startsWith("@")) return false;
  // A "dark" that only appears inside :not(...) selects the light theme.
  const positive = text.replace(/:not\((?:[^()]|\([^()]*\))*\)/gi, "");
  return /\.dark\b|\[\s*data-theme\s*=\s*["']?dark["']?\s*\]|\[\s*data-color-mode\s*=\s*["']?dark["']?\s*\]/i.test(
    positive,
  );
}

function parseValue(
  key: keyof Tokens,
  value: string,
): string | number | undefined {
  if (key === "radius" || key === "spacing") {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (key === "typeScale") return Number.parseFloat(value);
  return value.trim();
}

export function importCss(source: string): ImportResult {
  const tokens: Partial<Tokens> = {};
  const warnings: string[] = [];
  // Walk rules so declarations inside a dark selector or dark media query map to the dark* tokens.
  const stack: boolean[] = [];
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const pattern = /([^{};]*)\{|\}|(--[\w-]+)\s*:\s*([^;}]+)/g;
  for (const match of css.matchAll(pattern)) {
    if (match[1] !== undefined) {
      stack.push(isDarkPrelude(match[1]));
    } else if (match[2] === undefined) {
      stack.pop();
    } else {
      const name = match[2];
      if (derivedVariables.has(name)) continue;
      const baseKey = tokenMap[name];
      if (!baseKey) {
        warnings.push(`Skipped unsupported variable ${name}.`);
        continue;
      }
      const key = (stack.some(Boolean) && darkKeys[baseKey]) || baseKey;
      const value = parseValue(key, match[3].trim());
      if (value === undefined) warnings.push(`Could not parse ${name}.`);
      else (tokens[key] as string | number | undefined) = value;
    }
  }
  if (!Object.keys(tokens).length)
    warnings.push("No PRISM or compatible token variables were found.");
  return { tokens, warnings };
}

export function importJson(source: string): ImportResult {
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const candidate = (parsed.tokens ?? parsed.theme ?? parsed) as Record<
      string,
      unknown
    >;
    const tokens: Partial<Tokens> = {};
    const warnings: string[] = [];
    const wrapperKeys = candidate === parsed ? ["version", "name", "type"] : [];
    for (const name of Object.keys(candidate)) {
      if (wrapperKeys.includes(name)) continue;
      if (!(name in defaultTokens)) {
        warnings.push(`Ignored unknown token ${name}.`);
        continue;
      }
      const key = name as keyof Tokens;
      const value = candidate[key];
      if (typeof value === typeof defaultTokens[key])
        (tokens[key] as string | number | undefined) = value as string | number;
      else
        warnings.push(
          `Ignored ${name}: expected a ${typeof defaultTokens[key]}.`,
        );
    }
    if (!Object.keys(tokens).length)
      warnings.push("No supported token keys were found in this JSON file.");
    return { tokens, warnings };
  } catch {
    return { tokens: {}, warnings: ["The JSON could not be parsed."] };
  }
}

export function importTailwind(source: string): ImportResult {
  const result = importCss(source);
  const warnings = [...result.warnings];
  const radius = source.match(/borderRadius\s*[:=]\s*["']?([\d.]+)px?/i)?.[1];
  const spacing = source.match(/spacing\s*[:=]\s*["']?([\d.]+)px?/i)?.[1];
  if (radius) result.tokens.radius = Number(radius);
  if (spacing) result.tokens.spacing = Number(spacing);
  if (!radius && !spacing)
    warnings.push("No explicit Tailwind radius or spacing values were found.");
  return { tokens: result.tokens, warnings };
}
