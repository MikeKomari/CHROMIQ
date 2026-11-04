import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capture, createRouteGuard, hostGate } from "@/lib/server/capture";

/**
 * The capture guard against a real browser (CHROMIQ-702).
 *
 * tests/unit/capture.test.ts covers the guard's logic with a fake Route. This
 * covers what a fake cannot: that Chromium honours the guard, and that a
 * redirect chain really is walked by us rather than by the browser. Both
 * redirect bugs this code had passed the unit-level reasoning and were caught
 * here, so this file is the one that matters for the security claim.
 *
 * It needs Playwright and a Chromium binary. Where there is none the suite
 * skips rather than fails, so `npm test` stays green on a machine that cannot
 * run captures; the CI job that installs Chromium is what makes it run.
 */

const PRIVATE_HOST = "169.254.169.254";

async function playwrightAvailable() {
  try {
    const specifier = "playwright";
    await import(/* webpackIgnore: true */ specifier);
    return true;
  } catch {
    return false;
  }
}

const available = await playwrightAvailable();
const suite = available ? describe : describe.skip;

if (!available) {
  // Visible in the run rather than a silent zero.
  console.warn(
    "[capture] Playwright is not installed, so the capture integration tests were skipped. " +
      "Install it with: npx playwright@1.49.1 install chromium",
  );
}

suite("capture against a real browser", () => {
  let server: http.Server;
  let origin: string;
  let browser: { newContext(o?: unknown): Promise<never>; close(): Promise<void> };

  /**
   * The local test server is treated as public so the wiring under test is
   * reachable at all; everything the real resolver calls private stays
   * private. The resolver's own behaviour is covered in
   * tests/unit/url-safety.test.ts.
   */
  const allowLocalOnly = async (hostname: string) =>
    hostname !== "127.0.0.1" && hostname !== "localhost";

  beforeAll(async () => {
    server = http.createServer((request, response) => {
      const url = request.url ?? "/";
      const send = (status: number, headers: Record<string, string>, body = "") => {
        response.writeHead(status, headers);
        response.end(body);
      };
      if (url === "/to-metadata") {
        return send(302, { location: `http://${PRIVATE_HOST}/latest/meta-data/` });
      }
      if (url === "/hop1") return send(302, { location: `${origin}/hop2` });
      if (url === "/hop2") return send(302, { location: `${origin}/hop3` });
      if (url === "/hop3") return send(302, { location: `http://${PRIVATE_HOST}/` });
      if (url === "/relative") return send(302, { location: "/hop3" });
      if (url === "/good-redirect") return send(302, { location: `${origin}/landed` });
      if (url === "/landed") {
        return send(200, { "content-type": "text/html" }, "<!doctype html><title>Landed</title><h1>Landed</h1>");
      }
      if (url === "/with-subresources") {
        return send(
          200,
          { "content-type": "text/html" },
          `<!doctype html><title>Subresources</title><body><h1>ok</h1>
           <img src="http://${PRIVATE_HOST}/pixel.png">
           <link rel="stylesheet" href="http://10.0.0.5/theme.css">
           </body>`,
        );
      }
      return send(200, { "content-type": "text/html" }, "<!doctype html><title>Plain</title><h1>plain</h1>");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const specifier = "playwright";
    const playwright = (await import(/* webpackIgnore: true */ specifier)) as {
      chromium: { launch(o: { args: string[] }): Promise<typeof browser> };
    };
    browser = await playwright.chromium.launch({ args: ["--no-sandbox"] });
  }, 120_000);

  afterAll(async () => {
    await browser?.close().catch(() => {});
    server?.close();
  });

  /** Navigates with the real guard installed and reports what happened. */
  async function visit(path: string) {
    const gate = hostGate(allowLocalOnly);
    let resolved: string | null = null;
    const context = (await browser.newContext()) as unknown as {
      route(p: string, h: unknown): Promise<void>;
      newPage(): Promise<{
        goto(u: string, o: unknown): Promise<unknown>;
        url(): string;
        waitForTimeout(ms: number): Promise<void>;
      }>;
      close(): Promise<void>;
    };
    await context.route("**/*", createRouteGuard(gate, (url) => {
      resolved = url;
    }));
    const page = await context.newPage();
    let error: string | null = null;
    try {
      await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    } catch (thrown) {
      error = String((thrown as Error).message).split("\n")[0];
    }
    await page.waitForTimeout(500);
    const landed = page.url();
    await context.close();
    return { error, landed, resolved: resolved as string | null, refused: [...gate.refused] };
  }

  it("leaves an allowed page alone", async () => {
    const result = await visit("/");
    expect(result.error).toBeNull();
    expect(result.refused).toEqual([]);
  }, 60_000);

  it("follows a redirect that stays public, and reports where it ended", async () => {
    const result = await visit("/good-redirect");
    expect(result.error).toBeNull();
    expect(result.refused).toEqual([]);
    // page.url() cannot know: the guard walked the chain in place.
    expect(result.resolved).toBe(`${origin}/landed`);
  }, 60_000);

  it("refuses a redirect to the cloud metadata service", async () => {
    const result = await visit("/to-metadata");
    expect(result.error).toMatch(/BLOCKED_BY_CLIENT/);
    expect(result.refused).toContain(PRIVATE_HOST);
    expect(result.landed).not.toContain(PRIVATE_HOST);
  }, 60_000);

  it("refuses a chain that only turns inward at the last hop", async () => {
    // The bug that survived the single-hop test: fulfilling an allowed 3xx
    // let the browser run the rest of the chain unsupervised.
    const result = await visit("/hop1");
    expect(result.error).toMatch(/BLOCKED_BY_CLIENT/);
    expect(result.refused).toContain(PRIVATE_HOST);
    expect(result.landed).not.toContain(PRIVATE_HOST);
  }, 60_000);

  it("resolves a relative Location before judging it", async () => {
    const result = await visit("/relative");
    expect(result.error).toMatch(/BLOCKED_BY_CLIENT/);
    expect(result.refused).toContain(PRIVATE_HOST);
  }, 60_000);

  it("refuses private subresources while still rendering the page", async () => {
    const result = await visit("/with-subresources");
    expect(result.error).toBeNull();
    expect(result.refused).toEqual(expect.arrayContaining([PRIVATE_HOST, "10.0.0.5"]));
  }, 60_000);

  describe("capture()", () => {
    const flag = process.env.CHROMIQ_CAPTURE;
    afterAll(() => {
      if (flag === undefined) delete process.env.CHROMIQ_CAPTURE;
      else process.env.CHROMIQ_CAPTURE = flag;
    });

    it("returns a labelled, timestamped result with measured colours", async () => {
      process.env.CHROMIQ_CAPTURE = "on";
      const outcome = await capture(new URL(`${origin}/landed`), "desktop", allowLocalOnly);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      const result = outcome.capture;
      expect(result.sourceType).toBe("headless capture");
      expect(Number.isNaN(Date.parse(result.capturedAt))).toBe(false);
      expect(result.viewport.id).toBe("desktop");
      expect(result.viewport.width).toBeGreaterThan(0);
      expect(result.url).toContain("/landed");
      expect(result.title).toBe("Landed");
      expect(result.screenshot.length).toBeGreaterThan(1000);
      expect(result.notes.length).toBeGreaterThanOrEqual(3);
    }, 90_000);

    it("refuses a private target without starting a browser", async () => {
      process.env.CHROMIQ_CAPTURE = "on";
      const outcome = await capture(new URL("http://169.254.169.254/"), "desktop");
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toBe("blocked");
      expect(outcome.retryable).toBe(false);
    }, 30_000);

    it("reports unavailable, and not retryable, when the flag is off", async () => {
      process.env.CHROMIQ_CAPTURE = "off";
      const outcome = await capture(new URL(`${origin}/`), "desktop", allowLocalOnly);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toBe("unavailable");
      expect(outcome.retryable).toBe(false);
    }, 30_000);

    it("treats an unreachable host as retryable", async () => {
      process.env.CHROMIQ_CAPTURE = "on";
      const outcome = await capture(new URL("http://127.0.0.1:1/"), "desktop", allowLocalOnly);
      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.retryable).toBe(true);
    }, 60_000);
  });
});
