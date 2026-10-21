import { hexToHsl, hslToHex } from "@/lib/color-math";
import {
  contrastRatio,
  failingPairs,
  semanticPairs,
  type ContrastPair,
} from "@/lib/contrast";
import type { Tokens } from "@/types/workspace";

type PairId = Pick<ContrastPair, "label" | "theme">;

const sameId = (a: PairId, b: PairId) =>
  a.label === b.label && a.theme === b.theme;

const passes = (pair: ContrastPair) =>
  contrastRatio(pair.fg, pair.bg) >= pair.min;

const maxIterations = 12;

/**
 * Nudges the lightness of the pair's token until the pair passes, keeping hue and saturation.
 * Prefers the smallest change that leaves every other passing pair passing; otherwise the smallest passing change,
 * never preferring a candidate that breaks a pair whose token is locked over one that does not.
 * Returns null when no lightness passes.
 */
export function fixPair(
  tokens: Tokens,
  pair: PairId,
  locked: string[] = [],
): Partial<Tokens> | null {
  const target = semanticPairs(tokens).find((item) => sameId(item, pair));
  if (!target) return null;
  const current = tokens[target.token] as string;
  const { h, s, l } = hexToHsl(current);
  const healthy = semanticPairs(tokens).filter(
    (item) => !sameId(item, pair) && passes(item),
  );
  let fallback: string | null = null;
  let lockedFallback: string | null = null;
  for (let step = 1; step <= 100; step += 1) {
    for (const lightness of [l + step, l - step]) {
      if (lightness < 0 || lightness > 100) continue;
      const candidate = hslToHex(h, s, lightness);
      if (candidate.toLowerCase() === current.toLowerCase()) continue;
      const next = semanticPairs({ ...tokens, [target.token]: candidate });
      const fixed = next.find((item) => sameId(item, pair));
      if (!fixed || !passes(fixed)) continue;
      const broken = healthy.filter((item) => {
        const after = next.find((entry) => sameId(entry, item));
        return !after || !passes(after);
      });
      if (!broken.length) return { [target.token]: candidate } as Partial<Tokens>;
      if (broken.some((item) => locked.includes(item.token)))
        lockedFallback ??= candidate;
      else fallback ??= candidate;
    }
  }
  const chosen = fallback ?? lockedFallback;
  return chosen ? ({ [target.token]: chosen } as Partial<Tokens>) : null;
}

/** Fixes every failing pair whose token is not locked. Pairs left failing come back in `unresolved`. */
export function fixAllPairs(
  tokens: Tokens,
  locked: string[],
): { changes: Partial<Tokens>; unresolved: ContrastPair[] } {
  let working = tokens;
  const changes: Partial<Tokens> = {};
  for (let round = 0; round < maxIterations; round += 1) {
    let progressed = false;
    for (const pair of failingPairs(working)) {
      if (locked.includes(pair.token)) continue;
      const stillFailing = semanticPairs(working).find((item) =>
        sameId(item, pair),
      );
      if (!stillFailing || passes(stillFailing)) continue;
      const fix = fixPair(working, pair, locked);
      if (!fix) continue;
      Object.assign(changes, fix);
      working = { ...working, ...fix };
      progressed = true;
    }
    if (!progressed) break;
  }
  return { changes, unresolved: failingPairs(working) };
}
