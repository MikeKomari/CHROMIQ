import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "@/lib/server/passwords";

/**
 * Login must fail closed. Every branch below is a way a stored hash can be
 * wrong -- truncated, from another scheme, or tampered with -- and in each one
 * verifyPassword has to return false rather than throw, because a thrown error
 * on this path is a 500 on a login form.
 *
 * scrypt at N=16384 costs about 100ms per call, so the derivation tests are
 * deliberately few.
 */

const PASSWORD = "a-correct-horse-battery";

describe("hashPassword", () => {
  it("produces a self-describing hash", async () => {
    const stored = await hashPassword(PASSWORD);
    const parts = stored.split("$");
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBe(16384);
    expect(parts).toHaveLength(6);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const [a, b] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)]);
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const stored = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
    expect(await verifyPassword(`${PASSWORD}x`, stored)).toBe(false);
  });

  it("treats visually identical Unicode as the same password", async () => {
    // Both spell "é"; a password typed on a different keyboard layout or
    // pasted from another app must still log the user in.
    const composed = "café-password";
    const precomposed = "café-password";
    const stored = await hashPassword(composed);
    expect(await verifyPassword(precomposed, stored)).toBe(true);
  });

  it.each([
    ["an empty string", ""],
    ["a bcrypt hash from another system", "$2b$12$abcdefghijklmnopqrstuv"],
    ["too few fields", "scrypt$16384$8$1$c2FsdA=="],
    ["too many fields", "scrypt$16384$8$1$c2FsdA==$a2V5$extra"],
    ["an unknown algorithm", "argon2id$16384$8$1$c2FsdA==$a2V5"],
    ["a non-numeric cost", "scrypt$abc$8$1$c2FsdA==$a2V5"],
    ["a fractional cost", "scrypt$16384.5$8$1$c2FsdA==$a2V5"],
    ["an empty salt", "scrypt$16384$8$1$$a2V5"],
    ["an empty key", "scrypt$16384$8$1$c2FsdA==$"],
  ])("returns false for %s", async (_label, stored) => {
    expect(await verifyPassword(PASSWORD, stored)).toBe(false);
  });

  it.each([
    ["N below the floor", "scrypt$512$8$1$c2FsdA==$a2V5"],
    ["N above the ceiling", "scrypt$2097152$8$1$c2FsdA==$a2V5"],
    ["r out of range", "scrypt$16384$64$1$c2FsdA==$a2V5"],
    ["p out of range", "scrypt$16384$8$32$c2FsdA==$a2V5"],
    ["r at zero", "scrypt$16384$0$1$c2FsdA==$a2V5"],
  ])("refuses %s instead of deriving with it", async (_label, stored) => {
    // Absurd parameters from a tampered row would hang the request rather than
    // fail it, so they are rejected before scrypt is ever called.
    const started = Date.now();
    expect(await verifyPassword(PASSWORD, stored)).toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it("refuses a truncated key instead of verifying its prefix", async () => {
    // scrypt ends in a single PBKDF2 pass, so its output is prefix-stable:
    // asking for 15 bytes returns the first 15 bytes of the 64-byte
    // derivation. Without a floor on the stored length, a row truncated to one
    // byte would accept about one password in 256.
    const stored = await hashPassword(PASSWORD);
    const parts = stored.split("$");
    const full = Buffer.from(parts[5], "base64");
    for (const bytes of [1, 8, 16, 31]) {
      parts[5] = full.subarray(0, bytes).toString("base64");
      expect(await verifyPassword(PASSWORD, parts.join("$"))).toBe(false);
    }
  });

  it("refuses a key long enough to be its own denial of service", async () => {
    const stored = await hashPassword(PASSWORD);
    const parts = stored.split("$");
    parts[5] = Buffer.alloc(4096).toString("base64");
    const started = Date.now();
    expect(await verifyPassword(PASSWORD, parts.join("$"))).toBe(false);
    expect(Date.now() - started).toBeLessThan(50);
  });

  it("still verifies a 32-byte hash, so raising KEY_LENGTH is not a lockout", async () => {
    // The floor has to let the shortest key this build would ever accept
    // through; needsRehash is what upgrades it.
    const stored = await hashPassword(PASSWORD);
    const parts = stored.split("$");
    const full = Buffer.from(parts[5], "base64");
    parts[5] = full.subarray(0, 32).toString("base64");
    expect(await verifyPassword(PASSWORD, parts.join("$"))).toBe(true);
  });
});

describe("needsRehash", () => {
  it("says no for a hash made with the current parameters", async () => {
    expect(needsRehash(await hashPassword(PASSWORD))).toBe(false);
  });

  it.each([
    ["N", "scrypt$8192$8$1$c2FsdA==$a2V5"],
    ["r", "scrypt$16384$4$1$c2FsdA==$a2V5"],
  ])("says yes when %s is weaker than today's setting", (_label, stored) => {
    expect(needsRehash(stored)).toBe(true);
  });

  it("says no when a hash is stronger than today's setting", () => {
    // Raising N and then lowering it again must not mark every row for rehash.
    expect(needsRehash("scrypt$65536$8$1$c2FsdA==$a2V5")).toBe(false);
  });

  it.each([
    ["an unparseable hash", "nonsense"],
    ["another algorithm", "argon2id$16384$8$1$c2FsdA==$a2V5"],
    ["an empty string", ""],
  ])("says yes for %s, so the next login replaces it", (_label, stored) => {
    expect(needsRehash(stored)).toBe(true);
  });
});
