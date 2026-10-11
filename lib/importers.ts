import type { ImportResult, Tokens } from "@/types/workspace";

const tokenMap: Record<string, keyof Tokens> = {
  "--prism-accent": "accent",
  "--prism-accent-soft": "accentSoft",
  "--prism-ink": "ink",
  "--prism-paper": "paper",
  "--prism-muted": "muted",
  "--prism-line": "line",
  "--prism-radius": "radius",
  "--prism-space": "spacing",
};

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
  const declarations = source.match(/--[\w-]+\s*:\s*[^;]+/g) ?? [];
  for (const declaration of declarations) {
    const [rawName, ...rawValue] = declaration.split(":");
    const name = rawName.trim();
    const key = tokenMap[name];
    if (!key) {
      warnings.push(`Skipped unsupported variable ${name}.`);
      continue;
    }
    const value = parseValue(key, rawValue.join(":").trim());
    if (value === undefined) warnings.push(`Could not parse ${name}.`);
    else (tokens[key] as string | number | undefined) = value;
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
    for (const key of Object.keys(tokenMap).map((name) => tokenMap[name])) {
      if (
        candidate[key] !== undefined &&
        (typeof candidate[key] === "string" ||
          typeof candidate[key] === "number")
      ) {
        (tokens[key] as string | number | undefined) = candidate[key] as
          string | number;
      }
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
