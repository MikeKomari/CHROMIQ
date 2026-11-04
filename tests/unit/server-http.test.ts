import { afterEach, describe, expect, it } from "vitest";

import {
  BODY_TOO_LARGE,
  clientKey,
  isBodyTooLarge,
  readJsonBody,
  validateCredentials,
} from "@/lib/server/http";

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
  const ORIGINAL = process.env.CHROMIQ_TRUSTED_PROXY_HOPS;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CHROMIQ_TRUSTED_PROXY_HOPS;
    else process.env.CHROMIQ_TRUSTED_PROXY_HOPS = ORIGINAL;
  });

  it("uses the only entry when one proxy set it", () => {
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("ignores what the caller prepended", () => {
    // A proxy appends what it saw, so a forged value stays in front of it.
    // Reading from the left handed the caller a fresh quota on demand.
    expect(
      clientKey(request({ "x-forwarded-for": "1.2.3.4, 203.0.113.5" })),
    ).toBe("203.0.113.5");
  });

  it("ignores a whole forged chain", () => {
    expect(
      clientKey(request({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.5" })),
    ).toBe("203.0.113.5");
  });

  it("trims whitespace around the address", () => {
    expect(clientKey(request({ "x-forwarded-for": "  203.0.113.5  " }))).toBe("203.0.113.5");
  });

  it("skips further entries when more proxies are declared", () => {
    process.env.CHROMIQ_TRUSTED_PROXY_HOPS = "2";
    expect(
      clientKey(request({ "x-forwarded-for": "1.2.3.4, 203.0.113.5, 10.0.0.1" })),
    ).toBe("203.0.113.5");
  });

  it("clamps rather than walking off the front of a short chain", () => {
    // Two proxies declared, one entry present: it must not fall through to
    // something the caller could have written.
    process.env.CHROMIQ_TRUSTED_PROXY_HOPS = "3";
    expect(clientKey(request({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("trusts nothing when no proxy is declared", () => {
    // Reachable directly: every caller shares one bucket, which over-limits
    // rather than under-limits.
    process.env.CHROMIQ_TRUSTED_PROXY_HOPS = "0";
    expect(clientKey(request({ "x-forwarded-for": "1.2.3.4, 203.0.113.5" }))).toBe("unknown");
  });

  it.each(["-1", "abc", "1.5", ""])(
    "falls back to one hop for the unusable setting %p",
    (value) => {
      process.env.CHROMIQ_TRUSTED_PROXY_HOPS = value;
      expect(
        clientKey(request({ "x-forwarded-for": "1.2.3.4, 203.0.113.5" })),
      ).toBe("203.0.113.5");
    },
  );

  it("caps the hop count, so a huge value cannot reach the forged end", () => {
    process.env.CHROMIQ_TRUSTED_PROXY_HOPS = "9999";
    const chain = Array.from({ length: 12 }, (_, i) => `10.0.0.${i}`).join(", ");
    expect(clientKey(request({ "x-forwarded-for": `1.2.3.4, ${chain}` }))).not.toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when the forwarded header is absent", () => {
    expect(clientKey(request({ "x-real-ip": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip when the forwarded header is empty", () => {
    expect(
      clientKey(request({ "x-forwarded-for": "", "x-real-ip": "198.51.100.9" })),
    ).toBe("198.51.100.9");
  });

  it("returns a constant when no address header is present", () => {
    // Everyone shares one bucket rather than nobody being limited at all.
    expect(clientKey(request({}))).toBe("unknown");
  });

  it("returns a constant when the headers are blank", () => {
    expect(clientKey(request({ "x-forwarded-for": " , , ", "x-real-ip": "  " }))).toBe("unknown");
  });
});


describe("readJsonBody", () => {
  /** A stand-in for NextRequest carrying a body as a stream, as a real
   *  chunked request does. */
  function streamed(text: string, chunkSize = 1024) {
    const bytes = new TextEncoder().encode(text);
    let at = 0;
    let cancelled = false;
    const stream = {
      getReader: () => ({
        read: async () => {
          if (at >= bytes.length) return { done: true, value: undefined };
          const value = bytes.subarray(at, at + chunkSize);
          at += chunkSize;
          return { done: false, value };
        },
        cancel: async () => {
          cancelled = true;
        },
      }),
    };
    const request = {
      body: stream,
      json: async () => JSON.parse(text),
    } as never;
    return { request, wasCancelled: () => cancelled, consumed: () => at };
  }

  it("parses an ordinary body", async () => {
    const { request } = streamed(JSON.stringify({ a: 1 }));
    await expect(readJsonBody(request)).resolves.toEqual({ a: 1 });
  });

  it("parses a body split across many chunks", async () => {
    const payload = { events: Array.from({ length: 50 }, (_, i) => ({ name: `e${i}` })) };
    const { request } = streamed(JSON.stringify(payload), 16);
    await expect(readJsonBody(request)).resolves.toEqual(payload);
  });

  it("returns null for malformed JSON rather than throwing", async () => {
    const { request } = streamed("{not json");
    await expect(readJsonBody(request)).resolves.toBeNull();
  });

  it("returns null for an empty body", async () => {
    const { request } = streamed("");
    await expect(readJsonBody(request)).resolves.toBeNull();
  });

  it("refuses a body over the cap", async () => {
    // The size is measured while reading. Content-Length is the client's
    // claim and is simply absent on a chunked request, so it cannot be the
    // thing the limit rests on.
    const { request } = streamed(JSON.stringify({ blob: "x".repeat(50_000) }));
    await expect(readJsonBody(request, 1024)).resolves.toBe(BODY_TOO_LARGE);
  });

  it("stops reading instead of buffering the whole oversized body", async () => {
    const body = JSON.stringify({ blob: "x".repeat(500_000) });
    const probe = streamed(body, 1024);
    await readJsonBody(probe.request, 4096);
    expect(probe.wasCancelled()).toBe(true);
    // It gave up near the cap rather than draining half a megabyte.
    expect(probe.consumed()).toBeLessThan(10_000);
  });

  it("accepts a body exactly at the cap", async () => {
    const text = JSON.stringify({ a: "x".repeat(100) });
    const { request } = streamed(text);
    const size = new TextEncoder().encode(text).length;
    await expect(readJsonBody(request, size)).resolves.toEqual(JSON.parse(text));
  });

  it("falls back to request.json() when there is no stream", async () => {
    const request = { body: null, json: async () => ({ ok: true }) } as never;
    await expect(readJsonBody(request)).resolves.toEqual({ ok: true });
  });

  it("returns null when the fallback itself throws", async () => {
    const request = {
      body: null,
      json: async () => {
        throw new Error("no body");
      },
    } as never;
    await expect(readJsonBody(request)).resolves.toBeNull();
  });

  it("returns null when the stream errors partway", async () => {
    const request = {
      body: {
        getReader: () => ({
          read: async () => {
            throw new Error("connection reset");
          },
          cancel: async () => {},
        }),
      },
      json: async () => ({}),
    } as never;
    await expect(readJsonBody(request)).resolves.toBeNull();
  });
});

describe("isBodyTooLarge", () => {
  it("recognises the sentinel", () => {
    expect(isBodyTooLarge(BODY_TOO_LARGE)).toBe(true);
  });

  it.each([null, undefined, {}, "", 0, Symbol("other")])(
    "is false for %s",
    (value) => {
      expect(isBodyTooLarge(value)).toBe(false);
    },
  );

  it("is not an object, so a caller that only checks the type still refuses it", () => {
    // Routes written before this existed test `typeof body !== "object"`.
    // The sentinel has to fail that check rather than slip past it.
    expect(typeof BODY_TOO_LARGE).not.toBe("object");
  });
});
