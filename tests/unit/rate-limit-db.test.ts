import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The shared limiter's contract is small but load-bearing: every instance must
 * count against one window, and a limiter outage must degrade to per-instance
 * counting rather than failing the route. Both of those are failure paths, so
 * they are the ones worth pinning down.
 */

const queryOne = vi.fn();

// Only the query surface is stubbed; `databaseConfigured` still reads the real
// environment, so these tests exercise the same feature-flag path production does.
vi.mock("@/lib/db", () => ({
  queryOne: (...args: unknown[]) => queryOne(...args),
  databaseConfigured: () => Boolean(process.env.DATABASE_URL),
}));

const ORIGINAL = {
  accounts: process.env.CHROMIQ_ACCOUNTS,
  databaseUrl: process.env.DATABASE_URL,
};

async function load() {
  vi.resetModules();
  return import("@/lib/server/rate-limit-db");
}

function withDatabase() {
  process.env.DATABASE_URL = "postgres://user:pw@localhost:5432/chromiq";
  delete process.env.CHROMIQ_ACCOUNTS;
}

beforeEach(() => {
  queryOne.mockReset();
  // Pruning is probabilistic; keep it out of the assertions on call counts.
  vi.spyOn(Math, "random").mockReturnValue(0.99);
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL.accounts === undefined) delete process.env.CHROMIQ_ACCOUNTS;
  else process.env.CHROMIQ_ACCOUNTS = ORIGINAL.accounts;
  if (ORIGINAL.databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL.databaseUrl;
});

describe("rateLimit with a database", () => {
  it("allows a request inside the limit", async () => {
    withDatabase();
    queryOne.mockResolvedValue({ count: 3 });
    const { rateLimit } = await load();
    await expect(rateLimit("proxy", "1.2.3.4", 5)).resolves.toBe(0);
  });

  it("returns seconds to wait once the limit is passed", async () => {
    withDatabase();
    queryOne.mockResolvedValue({ count: 6 });
    const { rateLimit } = await load();
    const wait = await rateLimit("proxy", "1.2.3.4", 5);
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60);
  });

  it("aligns every caller onto the same window boundary", async () => {
    withDatabase();
    queryOne.mockResolvedValue({ count: 1 });
    const { rateLimit } = await load();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
    await rateLimit("proxy", "a", 5);
    vi.setSystemTime(new Date("2026-01-01T00:00:50.000Z"));
    await rateLimit("proxy", "a", 5);
    const first = queryOne.mock.calls[0][1] as unknown[];
    const second = queryOne.mock.calls[1][1] as unknown[];
    // Two requests 40 seconds apart inside one minute share a window, so a
    // second instance cannot reset the first instance's counter.
    expect((first[2] as Date).toISOString()).toBe((second[2] as Date).toISOString());
    vi.useRealTimers();
  });

  it("falls back to per-instance counting when the limiter is unreachable", async () => {
    withDatabase();
    queryOne.mockRejectedValue(new Error("ECONNREFUSED"));
    const { rateLimit } = await load();
    // The route stays up: the first calls are allowed, and the in-process
    // counter still catches the run-away caller.
    for (let i = 0; i < 2; i++) {
      await expect(rateLimit("outage", "9.9.9.9", 2)).resolves.toBe(0);
    }
    await expect(rateLimit("outage", "9.9.9.9", 2)).resolves.toBeGreaterThan(0);
  });

  it("counts in process when the database is switched off", async () => {
    delete process.env.DATABASE_URL;
    process.env.CHROMIQ_ACCOUNTS = "off";
    const { rateLimit } = await load();
    await expect(rateLimit("local", "7.7.7.7", 1)).resolves.toBe(0);
    await expect(rateLimit("local", "7.7.7.7", 1)).resolves.toBeGreaterThan(0);
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("treats a missing row as the first hit rather than throwing", async () => {
    withDatabase();
    queryOne.mockResolvedValue(null);
    const { rateLimit } = await load();
    await expect(rateLimit("proxy", "5.5.5.5", 5)).resolves.toBe(0);
  });
});

describe("pruneRateLimits", () => {
  it("does nothing when the database is switched off", async () => {
    delete process.env.DATABASE_URL;
    process.env.CHROMIQ_ACCOUNTS = "off";
    const { pruneRateLimits } = await load();
    await pruneRateLimits();
    expect(queryOne).not.toHaveBeenCalled();
  });

  it("swallows a failed delete, because it is housekeeping only", async () => {
    withDatabase();
    queryOne.mockRejectedValue(new Error("deadlock detected"));
    const { pruneRateLimits } = await load();
    await expect(pruneRateLimits()).resolves.toBeUndefined();
  });
});
