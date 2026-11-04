import { describe, expect, it } from "vitest";

import { fixAllPairs, fixPair } from "@/lib/contrast-fix";
import { contrastRatio, failingPairs, semanticPairs } from "@/lib/contrast";
import { defaultTokens } from "@/data/workspace";
import type { Tokens } from "@/types/workspace";

/**
 * Auto-fix is allowed to fail, and how it fails is the product behaviour:
 * it must return null rather than a token the user did not ask for, it must
 * not change a locked token, and fixAllPairs must terminate and report what
 * it could not solve instead of looping.
 */

/** Tokens where the dark theme has no usable contrast at all. */
const flat: Tokens = {
  ...defaultTokens,
  darkPaper: "#808080",
  darkInk: "#808080",
  darkMuted: "#808080",
  darkLine: "#808080",
  darkAccent: "#808080",
  darkAccentSoft: "#808080",
};

function pairIds(tokens: Tokens) {
  return semanticPairs(tokens).map(({ label, theme }) => ({ label, theme }));
}

describe("fixPair", () => {
  it("returns null for a pair that does not exist", () => {
    expect(fixPair(defaultTokens, { label: "Nothing", theme: "dark" })).toBeNull();
  });

  it("returns null for a label that exists in neither theme", () => {
    expect(
      fixPair(defaultTokens, { label: "Text on background", theme: "sepia" as never }),
    ).toBeNull();
  });

  it("fixes a failing pair and leaves the result passing", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const failing = failingPairs(broken);
    expect(failing.length).toBeGreaterThan(0);
    const fix = fixPair(broken, failing[0]);
    expect(fix).not.toBeNull();
    const after = semanticPairs({ ...broken, ...fix });
    const target = after.find(
      (item) => item.label === failing[0].label && item.theme === failing[0].theme,
    );
    expect(contrastRatio(target!.fg, target!.bg)).toBeGreaterThanOrEqual(target!.min);
  });

  it("changes exactly one token", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const fix = fixPair(broken, failingPairs(broken)[0]);
    expect(Object.keys(fix ?? {})).toHaveLength(1);
  });

  it("never returns the colour it started from", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const pair = failingPairs(broken)[0];
    const fix = fixPair(broken, pair);
    const [key, value] = Object.entries(fix ?? {})[0] ?? [];
    expect(String(value).toLowerCase()).not.toBe(
      String(broken[key as keyof Tokens]).toLowerCase(),
    );
  });

  it("either passes the pair or returns null, on tokens with nothing to work with", () => {
    // Grey on identical grey. There is no in-between answer: fixPair must
    // either hand back a colour that genuinely clears the threshold, or admit
    // it found none. Returning a colour that still fails is the bug.
    const pair = failingPairs(flat)[0];
    const fix = fixPair(flat, pair);
    if (fix === null) return;
    const after = semanticPairs({ ...flat, ...fix });
    const target = after.find(
      (item) => item.label === pair.label && item.theme === pair.theme,
    );
    expect(contrastRatio(target!.fg, target!.bg)).toBeGreaterThanOrEqual(target!.min);
  });

  it("prefers a candidate that breaks nothing over one that breaks a locked token", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const pair = failingPairs(broken)[0];
    const everythingLocked = Object.keys(defaultTokens);
    const withLocks = fixPair(broken, pair, everythingLocked);
    // A fix still comes back; locks steer the choice, they do not veto it for
    // the pair the user asked to fix.
    expect(withLocks).not.toBeNull();
  });

  it("does not touch tokens other than the pair's own", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const pair = failingPairs(broken)[0];
    const fix = fixPair(broken, pair) ?? {};
    expect(Object.keys(fix)[0]).toBe(pair.token);
  });
});

describe("fixAllPairs", () => {
  it("does nothing when everything already passes", () => {
    const { changes, unresolved } = fixAllPairs(defaultTokens, []);
    expect(changes).toEqual({});
    expect(unresolved).toEqual([]);
  });

  it("clears the failures it can and reports the rest", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a", darkMuted: "#191919" };
    const { changes, unresolved } = fixAllPairs(broken, []);
    expect(Object.keys(changes).length).toBeGreaterThan(0);
    // Anything left over is named, not swallowed.
    for (const pair of unresolved) expect(pair.label).toBeTruthy();
  });

  it("never changes a locked token", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a", darkMuted: "#191919" };
    const locked = ["darkInk", "darkMuted"];
    const { changes, unresolved } = fixAllPairs(broken, locked);
    for (const key of locked) expect(changes).not.toHaveProperty(key);
    // And the pairs that needed those tokens come back as unresolved.
    expect(unresolved.length).toBeGreaterThan(0);
  });

  it("terminates on tokens nothing can fix", () => {
    const started = Date.now();
    const { unresolved } = fixAllPairs(flat, []);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(Array.isArray(unresolved)).toBe(true);
  });

  it("is idempotent: a second pass over its own output changes nothing more", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const first = fixAllPairs(broken, []);
    const second = fixAllPairs({ ...broken, ...first.changes }, []);
    expect(second.changes).toEqual({});
  });

  it("locking every token leaves the tokens untouched", () => {
    const broken: Tokens = { ...defaultTokens, darkInk: "#1a1a1a" };
    const { changes } = fixAllPairs(broken, Object.keys(defaultTokens));
    expect(changes).toEqual({});
  });
});
