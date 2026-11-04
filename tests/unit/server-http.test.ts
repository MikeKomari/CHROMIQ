import { describe, expect, it } from "vitest";

import { clientKey, validateCredentials } from "@/lib/server/http";

/**
 * validateCredentials is the first thing a login or signup body meets, and
 * clientKey is what every rate limit is keyed on, so a wrong answer here is
 * either a 500 further down or a limiter that cannot tell callers apart.
 */

function request(headers: Record<string, string>) {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as never;
}

describe("validateCredentials", () => {
  it("accepts a well-formed pair and normalizes the email", () => {
    const result = validateCredentials({ email: "  Person@Example.COM ", password: "0123456789" });
    expect(result.error).toBeUndefined();
    expect(result.email).toBe("person@example.com");
    expect(result.password).toBe("0123456789");
  });

  it("does not trim or alter the password", () => {
    // Trimming would silently reject a password the user actually chose.
    const result = validateCredentials({ email: "a@b.co", password: "  spaces  both  " });
    expect(result.password).toBe("  spaces  both  ");
  });

  it.each([
    ["null", null],
    ["a string", "email=a@b.co"],
    ["a number", 42],
    ["an array", []],
  ])("rejects a body that is %s", (_label, body) => {
    expect(validateCredentials(body).error).toBeTruthy();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace", "   "],
    ["no at sign", "person.example.com"],
    ["no domain dot", "person@example"],
    ["spaces inside", "pers on@example.com"],
    ["two at signs", "a@b@example.com"],
    ["not a string", 1234],
    ["an object", { toString: () => "a@b.co" }],
  ])("rejects an email that is %s", (_label, email) => {
    const result = validateCredentials({ email, password: "0123456789" });
    expect(result.error).toBe("Enter a valid email address.");
  });

  it("rejects an email over the column's length", () => {
    const email = `${"a".repeat(320)}@example.com`;
    expect(validateCredentials({ email, password: "0123456789" }).error).toBe(
      "Enter a valid email address.",
    );
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["nine characters", "123456789"],
    ["not a string", 1234567890],
  ])("rejects a password that is %s", (_label, password) => {
    const result = validateCredentials({ email: "a@b.co", password });
    expect(result.error).toBe("Use a password of at least 10 characters.");
  });

  it("accepts exactly ten characters", () => {
    expect(validateCredentials({ email: "a@b.co", password: "0123456789" }).error).toBeUndefined();
  });

  it("caps the password length, because scrypt cost scales with input", () => {
    // A megabyte-long password would otherwise stall a worker for the duration
    // of the derivation.
    const result = validateCredentials({ email: "a@b.co", password: "x".repeat(201) });
    expect(result.error).toBe("That password is too long (200 characters maximum).");
  });

  it("accepts exactly two hundred characters", () => {
    expect(
      validateCredentials({ email: "a@b.co", password: "x".repeat(200) }).error,
    ).toBeUndefined();
  });

  it("checks the email before the password, so the first message is the first problem", () => {
    const result = validateCredentials({ email: "nope", password: "short" });
    expect(result.error).toBe("Enter a valid email address.");
  });
});

describe("clientKey", () => {
  it("uses the first hop of x-forwarded-for", () => {
    // The rest of the chain is whatever the client sent; only the first entry
    // is the address the edge saw.
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" }))).toBe(
      "203.0.113.5",
    );
  });

  it("trims whitespace around the address", () => {
    expect(clientKey(request({ "x-forwarded-for": "  203.0.113.5  " }))).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when the forwarded header is absent", () => {
    expect(clientKey(request({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip when the forwarded header is empty", () => {
    // An empty first hop must not become the key: every caller would share it.
    expect(
      clientKey(request({ "x-forwarded-for": "", "x-real-ip": "198.51.100.9" })),
    ).toBe("198.51.100.9");
  });

  it("returns a constant when no address header is present", () => {
    // Everyone shares one bucket rather than nobody being limited at all.
    expect(clientKey(request({}))).toBe("unknown");
  });

  it("returns a constant when the headers are blank", () => {
    expect(clientKey(request({ "x-forwarded-for": "   ", "x-real-ip": "  " }))).toBe("unknown");
  });
});
