import { describe, expect, it } from "vitest";

import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";

/**
 * safeFetch is what stands between /api/inspect and /api/proxy and the inside
 * of the network, so what it REFUSES is the part worth pinning down.
 *
 * These cover the cases it rejects before a socket is opened, which is all of
 * the address validation. The body, redirect-following and decompression paths
 * need a reachable public host, which the environment these were written in
 * does not have; they are exercised by the inspect and proxy routes in use
 * rather than here, and that gap is stated rather than papered over with a
 * mock that would only assert the mock.
 */

const OPTIONS = {
  timeoutMs: 2000,
  maxBytes: 1024,
  maxRedirects: 2,
  headers: { "user-agent": "test" },
};

async function codeFor(url: string) {
  try {
    await safeFetch(new URL(url), OPTIONS);
    return "no-error";
  } catch (error) {
    return error instanceof SafeFetchError ? error.code : `other:${(error as Error).message}`;
  }
}

describe("safeFetch refuses non-public addresses", () => {
  it.each([
    ["loopback by name", "http://localhost/"],
    ["loopback by address", "http://127.0.0.1/"],
    ["loopback, another address in the range", "http://127.255.255.254/"],
    ["IPv6 loopback", "http://[::1]/"],
    ["link-local, where cloud metadata lives", "http://169.254.169.254/latest/meta-data/"],
    ["private 10/8", "http://10.0.0.5/"],
    ["private 172.16/12", "http://172.16.0.1/"],
    ["private 192.168/16", "http://192.168.1.1/"],
    ["carrier-grade NAT", "http://100.64.0.1/"],
    ["this-network", "http://0.0.0.0/"],
    ["IPv6 unique-local", "http://[fd00::1]/"],
    ["IPv6 link-local", "http://[fe80::1]/"],
    ["a .local name", "http://printer.local/"],
    ["a .internal name", "http://db.internal/"],
    ["a .localhost name", "http://anything.localhost/"],
  ])("refuses %s", async (_label, url) => {
    await expect(codeFor(url)).resolves.toBe("blocked");
  });

  it("refuses a trailing-dot hostname, which resolves the same", async () => {
    await expect(codeFor("http://localhost./")).resolves.toBe("blocked");
  });

  it("refuses an IPv4 address written inside IPv6 brackets", async () => {
    await expect(codeFor("http://[::ffff:127.0.0.1]/")).resolves.toBe("blocked");
  });
});

describe("safeFetch refuses anything that is not plain web traffic", () => {
  it.each([
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://example.com/x"],
    ["gopher:", "gopher://example.com/"],
    ["data:", "data:text/html,hi"],
  ])("refuses the %s scheme", async (_label, url) => {
    await expect(codeFor(url)).resolves.toBe("blocked");
  });
});

describe("safeFetch refuses credentials in the address", () => {
  // Otherwise a crafted link makes the server send someone else's Basic auth
  // to a host of the attacker's choosing.
  it.each([
    ["a username", "http://user@example.com/"],
    ["a username and password", "http://user:secret@example.com/"],
    ["a password only", "http://:secret@example.com/"],
  ])("refuses %s", async (_label, url) => {
    await expect(codeFor(url)).resolves.toBe("blocked");
  });

  it("never lets the password reach the error it throws", async () => {
    try {
      await safeFetch(new URL("http://user:hunter2@example.com/"), OPTIONS);
      throw new Error("should have refused");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("hunter2");
      expect(JSON.stringify(error)).not.toContain("hunter2");
    }
  });
});

describe("safeFetch respects its deadline", () => {
  it("gives up without opening a socket when no time is left", async () => {
    // A caller that has already spent its budget does not get a free request.
    // The address is public and unroutable, so reaching the network at all
    // would hang rather than return -- which is the point: this has to fail
    // before it tries.
    const started = Date.now();
    try {
      await safeFetch(new URL("http://192.0.2.1/"), { ...OPTIONS, timeoutMs: 0 });
      throw new Error("should have timed out");
    } catch (error) {
      expect(error).toBeInstanceOf(SafeFetchError);
      expect((error as SafeFetchError).code).toBe("blocked");
    }
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe("SafeFetchError", () => {
  it("carries its code as the message when none is given", () => {
    expect(new SafeFetchError("blocked").message).toBe("blocked");
  });

  it("keeps a supplied message while keeping the code readable", () => {
    const error = new SafeFetchError("failed", "ECONNREFUSED");
    expect(error.code).toBe("failed");
    expect(error.message).toBe("ECONNREFUSED");
  });

  it("is an Error, so an unexpected throw is still catchable as one", () => {
    expect(new SafeFetchError("timeout")).toBeInstanceOf(Error);
  });
});
