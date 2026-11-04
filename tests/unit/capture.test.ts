import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capture,
  CAPTURE_VIEWPORTS,
  CAPTURE_VIEWPORT_IDS,
  captureFlagOn,
  createRouteGuard,
  hostGate,
} from "@/lib/server/capture";

/**
 * The parts of capture that need no browser. The guard's behaviour against a
 * real Chromium -- redirect chains, subresources, the abort itself -- is in
 * tests/integration/capture-ssrf.test.ts, which skips where Playwright is not
 * installed. These run everywhere, including CI.
 */

const ORIGINAL = process.env.CHROMIQ_CAPTURE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CHROMIQ_CAPTURE;
  else process.env.CHROMIQ_CAPTURE = ORIGINAL;
});

describe("captureFlagOn", () => {
  it("is off when unset, because most deployments have no browser", () => {
    delete process.env.CHROMIQ_CAPTURE;
    expect(captureFlagOn()).toBe(false);
  });

  it.each(["on", "ON", " on ", "1", "true"])("is on for %s", (value) => {
    process.env.CHROMIQ_CAPTURE = value;
    expect(captureFlagOn()).toBe(true);
  });

  it.each(["off", "no", "0", "false", "", "maybe"])("is off for %s", (value) => {
    process.env.CHROMIQ_CAPTURE = value;
    expect(captureFlagOn()).toBe(false);
  });
});

describe("CAPTURE_VIEWPORTS", () => {
  it("offers a closed set, so a caller cannot ask for an enormous bitmap", () => {
    expect(CAPTURE_VIEWPORT_IDS).toEqual(["desktop", "tablet", "mobile"]);
  });

  it("gives every viewport a sane size, scale and label", () => {
    for (const id of CAPTURE_VIEWPORT_IDS) {
      const viewport = CAPTURE_VIEWPORTS[id];
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.width).toBeLessThanOrEqual(1920);
      expect(viewport.height).toBeGreaterThan(0);
      expect(viewport.height).toBeLessThanOrEqual(2000);
      expect(viewport.deviceScaleFactor).toBeGreaterThanOrEqual(1);
      expect(viewport.deviceScaleFactor).toBeLessThanOrEqual(3);
      expect(viewport.label).toMatch(/\d+x\d+/);
    }
  });
});

describe("hostGate", () => {
  /** Only the DNS decision is stubbed; the URL handling below is the real thing. */
  const gate = () => hostGate(async (host) => host.endsWith(".private"));

  it("allows an ordinary http(s) url", async () => {
    await expect(gate().allow("https://example.com/a")).resolves.toBe(true);
    await expect(gate().allow("http://example.com/a")).resolves.toBe(true);
  });

  it("refuses a host the resolver calls private, and records it", async () => {
    const g = gate();
    await expect(g.allow("https://inside.private/x")).resolves.toBe(false);
    expect([...g.refused]).toEqual(["inside.private"]);
  });

  it.each([
    ["file:", "file:///etc/passwd"],
    ["ftp:", "ftp://example.com/x"],
    ["gopher:", "gopher://example.com/"],
    ["javascript:", "javascript:alert(1)"],
    ["ws:", "ws://example.com/socket"],
  ])("refuses the %s scheme", async (_label, url) => {
    await expect(gate().allow(url)).resolves.toBe(false);
  });

  it.each(["data:text/html,hi", "blob:https://example.com/abc"])(
    "allows %s, which reaches no network",
    async (url) => {
      // The page generated these itself; refusing them breaks ordinary pages
      // without protecting anything.
      await expect(gate().allow(url)).resolves.toBe(true);
    },
  );

  it.each(["", "not a url", "http://", "://example.com"])(
    "refuses the unparseable input %p",
    async (url) => {
      await expect(gate().allow(url)).resolves.toBe(false);
    },
  );

  it("asks the resolver once per host, however many requests use it", async () => {
    // A page makes hundreds of requests across a handful of hosts; a lookup
    // each time would eat the capture's time budget.
    const resolver = vi.fn(async () => false);
    const g = hostGate(resolver);
    for (let i = 0; i < 25; i++) await g.allow(`https://example.com/asset-${i}.png`);
    await g.allow("https://cdn.example.net/x.css");
    expect(resolver).toHaveBeenCalledTimes(2);
  });

  it("does not leak a decision between captures", async () => {
    const first = hostGate(async () => false);
    await first.allow("https://example.com/");
    const second = hostGate(async () => true);
    // A separate gate re-asks, so a name cannot be poisoned for a later run.
    await expect(second.allow("https://example.com/")).resolves.toBe(false);
  });

  it("refuses when the resolver itself throws", async () => {
    // url-safety fails closed on a lookup error; the gate must not turn that
    // into an allow.
    const g = hostGate(async () => {
      throw new Error("ENOTFOUND");
    });
    await expect(g.allow("https://example.com/")).rejects.toThrow();
  });
});

describe("createRouteGuard", () => {
  type Recorded = { aborted?: string; fulfilled?: boolean; fetched: string[] };

  /** A stand-in for Playwright's Route, recording what the guard did with it. */
  function fakeRoute(
    url: string,
    respond: (url: string) => { status: number; location?: string },
    resourceType = "document",
  ) {
    const recorded: Recorded = { fetched: [] };
    const route = {
      request: () => ({ url: () => url, resourceType: () => resourceType }),
      continue: async () => {},
      abort: async (code?: string) => {
        recorded.aborted = code ?? "aborted";
      },
      fetch: async (options?: { url?: string }) => {
        const at = options?.url ?? url;
        recorded.fetched.push(at);
        const { status, location } = respond(at);
        const headers: Record<string, string> = location ? { location } : {};
        return { status: () => status, headers: () => headers };
      },
      fulfill: async () => {
        recorded.fulfilled = true;
      },
    };
    return { route, recorded };
  }

  const openGate = () => hostGate(async (host) => host.endsWith(".private"));

  it("passes a plain 200 through to the browser", async () => {
    const { route, recorded } = fakeRoute("https://example.com/", () => ({ status: 200 }));
    await createRouteGuard(openGate())(route);
    expect(recorded.fulfilled).toBe(true);
    expect(recorded.aborted).toBeUndefined();
  });

  it("aborts a request to a private host before fetching anything", async () => {
    const { route, recorded } = fakeRoute("https://inside.private/", () => ({ status: 200 }));
    await createRouteGuard(openGate())(route);
    expect(recorded.aborted).toBe("blockedbyclient");
    expect(recorded.fetched).toEqual([]);
  });

  it("follows a redirect itself rather than letting the browser do it", async () => {
    // The browser following a 3xx is exactly the hole this guard exists to
    // close, so the guard must fetch each hop and hand back only the end.
    const { route, recorded } = fakeRoute("https://example.com/a", (at) =>
      at.endsWith("/a")
        ? { status: 302, location: "https://example.com/b" }
        : { status: 200 },
    );
    await createRouteGuard(openGate())(route);
    expect(recorded.fetched).toEqual(["https://example.com/a", "https://example.com/b"]);
    expect(recorded.fulfilled).toBe(true);
  });

  it("stops a chain at the hop that turns inward", async () => {
    const { route, recorded } = fakeRoute("https://example.com/1", (at) => {
      if (at.endsWith("/1")) return { status: 302, location: "https://example.com/2" };
      if (at.endsWith("/2")) return { status: 302, location: "https://inside.private/" };
      return { status: 200 };
    });
    const gate = openGate();
    await createRouteGuard(gate)(route);
    expect(recorded.aborted).toBe("blockedbyclient");
    expect(recorded.fulfilled).toBeUndefined();
    expect([...gate.refused]).toEqual(["inside.private"]);
    // It never fetched the private hop, only decided against it.
    expect(recorded.fetched).not.toContain("https://inside.private/");
  });

  it("resolves a relative Location against the hop that sent it", async () => {
    const { route, recorded } = fakeRoute("https://example.com/deep/a", (at) =>
      at.endsWith("/deep/a") ? { status: 302, location: "../b" } : { status: 200 },
    );
    await createRouteGuard(openGate())(route);
    expect(recorded.fetched[1]).toBe("https://example.com/b");
  });

  it("aborts a Location that is not a url at all", async () => {
    const { route, recorded } = fakeRoute("https://example.com/", () => ({
      status: 302,
      location: "http://",
    }));
    await createRouteGuard(openGate())(route);
    expect(recorded.aborted).toBe("blockedbyclient");
  });

  it("gives up on a redirect loop instead of following it for ever", async () => {
    const { route, recorded } = fakeRoute("https://example.com/loop", () => ({
      status: 302,
      location: "https://example.com/loop",
    }));
    await createRouteGuard(openGate())(route);
    expect(recorded.aborted).toBe("blockedbyclient");
    expect(recorded.fetched.length).toBeLessThanOrEqual(6);
  });

  it("passes a 3xx with no Location straight through", async () => {
    const { route, recorded } = fakeRoute("https://example.com/", () => ({ status: 304 }));
    await createRouteGuard(openGate())(route);
    expect(recorded.fulfilled).toBe(true);
  });

  it("reports where the document ended up, since the browser's url will not", async () => {
    // The guard walks the chain in place, so page.url() still shows what was
    // asked for. The capture needs the real destination.
    const seen: string[] = [];
    const { route } = fakeRoute("https://example.com/a", (at) =>
      at.endsWith("/a") ? { status: 301, location: "https://example.com/final" } : { status: 200 },
    );
    await createRouteGuard(openGate(), (url) => seen.push(url))(route);
    expect(seen).toEqual(["https://example.com/final"]);
  });

  it("does not report a destination for a subresource", async () => {
    const seen: string[] = [];
    const { route } = fakeRoute("https://example.com/x.png", () => ({ status: 200 }), "image");
    await createRouteGuard(openGate(), (url) => seen.push(url))(route);
    expect(seen).toEqual([]);
  });

  it("aborts rather than hanging when the fetch itself fails", async () => {
    const { route, recorded } = fakeRoute("https://example.com/", () => {
      throw new Error("ECONNREFUSED");
    });
    await createRouteGuard(openGate())(route);
    expect(recorded.aborted).toBe("failed");
  });
});

describe("capture(): credentials in the address", () => {
  const ORIGINAL = process.env.CHROMIQ_CAPTURE;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.CHROMIQ_CAPTURE;
    else process.env.CHROMIQ_CAPTURE = ORIGINAL;
  });

  it("never reports back a password that was in the url", async () => {
    // The capture promises a clean browser with no sign-in. Sending Basic
    // auth would make that note false, and the secret would travel back in
    // requestedUrl and url, which the client renders.
    process.env.CHROMIQ_CAPTURE = "on";
    const outcome = await capture(
      new URL("http://user:hunter2@example.com/page"),
      "desktop",
      // Refuse it before a browser is involved: this test is about what the
      // result says, not about rendering.
      async () => true,
    );
    expect(outcome.ok).toBe(false);
    expect(JSON.stringify(outcome)).not.toContain("hunter2");
  });
});
