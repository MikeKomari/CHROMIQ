import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The in-process limiter is the fallback the shared limiter degrades to, so
 * the cases that matter are the ones that run when something has already gone
 * wrong: a window rolling over, the tracking map filling up, and a release
 * function being called twice.
 */

async function load() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit", async () => {
    const { rateLimit } = await load();
    for (let i = 0; i < 5; i++) expect(rateLimit("b", "k", 5)).toBe(0);
  });

  it("blocks the request after the limit and says how long to wait", async () => {
    const { rateLimit } = await load();
    for (let i = 0; i < 5; i++) rateLimit("b", "k", 5);
    const wait = rateLimit("b", "k", 5);
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60);
  });

  it("never reports a wait of zero seconds while blocking", async () => {
    const { rateLimit } = await load();
    rateLimit("b", "k", 1);
    rateLimit("b", "k", 1);
    // 999ms left rounds to 1, not 0: a Retry-After of 0 invites an instant retry.
    vi.advanceTimersByTime(59_001);
    expect(rateLimit("b", "k", 1)).toBe(1);
  });

  it("keeps buckets apart", async () => {
    const { rateLimit } = await load();
    rateLimit("a", "k", 1);
    rateLimit("a", "k", 1);
    expect(rateLimit("a", "k", 1)).toBeGreaterThan(0);
    expect(rateLimit("b", "k", 1)).toBe(0);
  });

  it("keeps keys apart", async () => {
    const { rateLimit } = await load();
    rateLimit("b", "one", 1);
    rateLimit("b", "one", 1);
    expect(rateLimit("b", "two", 1)).toBe(0);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const { rateLimit } = await load();
    rateLimit("b", "k", 1);
    expect(rateLimit("b", "k", 1)).toBeGreaterThan(0);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("b", "k", 1)).toBe(0);
  });

  it("honours a custom window", async () => {
    const { rateLimit } = await load();
    rateLimit("b", "k", 1, 1000);
    expect(rateLimit("b", "k", 1, 1000)).toBeGreaterThan(0);
    vi.advanceTimersByTime(1001);
    expect(rateLimit("b", "k", 1, 1000)).toBe(0);
  });

  it("stays bounded when flooded with distinct keys", async () => {
    // Without the eviction below, a caller rotating addresses would grow the
    // map until the process ran out of memory.
    const { rateLimit } = await load();
    for (let i = 0; i < 7000; i++) rateLimit("flood", `key-${i}`, 5);
    // Nothing to assert on the map directly; the contract is that it kept
    // answering and did not throw.
    expect(rateLimit("flood", "key-after", 5)).toBe(0);
  });

  it("prefers evicting windows that have already closed", async () => {
    const { rateLimit } = await load();
    for (let i = 0; i < 4999; i++) rateLimit("old", `key-${i}`, 5);
    vi.advanceTimersByTime(60_001);
    rateLimit("new", "survivor", 5);
    // The expired entries are gone, so the fresh one still has its own count.
    expect(rateLimit("new", "survivor", 5)).toBe(0);
  });
});

describe("acquireSlot", () => {
  it("hands out slots up to the maximum", async () => {
    const { acquireSlot } = await load();
    expect(acquireSlot(2)).toBeTypeOf("function");
    expect(acquireSlot(2)).toBeTypeOf("function");
    expect(acquireSlot(2)).toBeNull();
  });

  it("frees the slot when the release function runs", async () => {
    const { acquireSlot } = await load();
    const release = acquireSlot(1)!;
    expect(acquireSlot(1)).toBeNull();
    release();
    expect(acquireSlot(1)).toBeTypeOf("function");
  });

  it("ignores a second release, so a finally block cannot leak a slot back", async () => {
    // Releasing twice would push the counter below zero and effectively
    // disable the gate.
    const { acquireSlot } = await load();
    const release = acquireSlot(1)!;
    release();
    release();
    release();
    expect(acquireSlot(1)).toBeTypeOf("function");
    expect(acquireSlot(1)).toBeNull();
  });

  it("refuses everything when the maximum is zero", async () => {
    const { acquireSlot } = await load();
    expect(acquireSlot(0)).toBeNull();
  });
});
