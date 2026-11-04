import { describe, expect, it } from "vitest";

import { SHARE_TTL_DAYS, shareExpiryFrom } from "@/lib/server/shares";

/**
 * Share expiry is a retention promise, not a cache setting: shares are the one
 * thing CHROMIQ stores for people who never made an account, so they cannot be
 * tied to anyone or deleted on request. The TTL is what makes keeping them
 * honest, so it is worth a test that would fail if someone widened it by
 * accident.
 */

describe("shareExpiryFrom", () => {
  it("expires a year out", () => {
    expect(SHARE_TTL_DAYS).toBe(365);
  });

  it("returns a Date the driver can bind", () => {
    const expiry = shareExpiryFrom();
    expect(expiry).toBeInstanceOf(Date);
    expect(Number.isNaN(expiry.getTime())).toBe(false);
  });

  it("counts from the moment given", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(shareExpiryFrom(now).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("is always in the future relative to its own clock", () => {
    expect(shareExpiryFrom(Date.now()).getTime()).toBeGreaterThan(Date.now());
  });

  it("crosses a leap day without drifting a day", () => {
    // 2028 is a leap year, so a naive "add 365 days" lands on 28 February.
    // That is the behaviour, and it is fine -- this pins it so a change is
    // deliberate rather than a surprise.
    const expiry = shareExpiryFrom(Date.UTC(2027, 2, 1));
    expect(expiry.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("defaults to now when called with no argument", () => {
    const before = Date.now();
    const expiry = shareExpiryFrom().getTime();
    const after = Date.now();
    const year = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;
    expect(expiry).toBeGreaterThanOrEqual(before + year);
    expect(expiry).toBeLessThanOrEqual(after + year);
  });
});
