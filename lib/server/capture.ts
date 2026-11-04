import { isBlockedHost } from "@/lib/url-safety";

/**
 * Headless browser capture (CHROMIQ-702).
 *
 * The existing inspector fetches HTML with scripts off and reconstructs what
 * it can. This renders the page in a real browser instead, so a client-rendered
 * site produces something honest rather than an empty shell, and the colours
 * and fonts come from computed styles rather than from parsing CSS text.
 *
 * ## Why this is the dangerous one
 *
 * `lib/safe-fetch.ts` protects the other outbound routes by resolving the host
 * itself, checking the address, and then connecting to that pinned address, so
 * a name that resolves differently a moment later cannot be used to reach the
 * inside of the network. None of that applies here. A browser does its own
 * DNS, follows its own redirects, and fetches every subresource a page asks
 * for. Handing it a URL and trusting the first check would mean one redirect
 * to `http://169.254.169.254/` reaches the cloud metadata service.
 *
 * So every single request the browser makes -- the first navigation, each
 * redirect hop, and every image, stylesheet, font and XHR -- goes through
 * `allow()` below before it is permitted. A request to a name that resolves to
 * a private address is aborted, and the capture reports what it refused rather
 * than silently rendering a page with holes in it.
 *
 * ## Why Playwright is not a dependency
 *
 * It needs a browser binary, which a serverless host does not have, and adding
 * it would make every `npm install` download three browsers for a feature most
 * deployments cannot run. It is imported dynamically and the whole feature
 * reports itself unavailable when the import fails, so the build and the other
 * routes are unaffected either way.
 */

/** Viewports a caller may ask for. A free-form size is not accepted: these are
 *  the ones the preview surfaces already use, and an unbounded width is a way
 *  to ask the browser to allocate an enormous bitmap. */
export const CAPTURE_VIEWPORTS = {
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, label: "Desktop 1280x800" },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 1, label: "Tablet 834x1112" },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, label: "Mobile 390x844" },
} as const;

export type CaptureViewport = keyof typeof CAPTURE_VIEWPORTS;

export const CAPTURE_VIEWPORT_IDS = Object.keys(CAPTURE_VIEWPORTS) as CaptureViewport[];

export type CaptureFailure =
  | "unavailable"
  | "blocked"
  | "timeout"
  | "navigation"
  | "upstream-status"
  | "not-html"
  | "crashed";

export type CaptureResult = {
  sourceType: "headless capture";
  /** What the caller asked for, which a redirect may have moved away from. */
  requestedUrl: string;
  /** Where the browser actually ended up. */
  url: string;
  capturedAt: string;
  viewport: { id: CaptureViewport; width: number; height: number; deviceScaleFactor: number; label: string };
  title: string;
  /** PNG, base64, no data: prefix. */
  screenshot: string;
  /** Colours in use, most-painted first, as #rrggbb. */
  colors: string[];
  /** Font families in use, most-used first. */
  fonts: string[];
  /** Hosts whose requests were refused for pointing inside the network. */
  refusedHosts: string[];
  /** Things the user should know about what they are looking at. */
  notes: string[];
};

export type CaptureOutcome =
  | { ok: true; capture: CaptureResult }
  | { ok: false; reason: CaptureFailure; message: string; retryable: boolean };

const NAVIGATION_TIMEOUT_MS = 20_000;
const SETTLE_MS = 1200;
const MAX_REFUSED_REPORTED = 10;
/** Hops followed inside the guard before a chain is treated as hostile. */
const MAX_REDIRECT_HOPS = 5;

/** Whether this deployment is configured to capture at all. */
export function captureFlagOn() {
  const raw = process.env.CHROMIQ_CAPTURE?.trim().toLowerCase();
  return raw === "on" || raw === "1" || raw === "true";
}

/**
 * The slice of Playwright this module uses, described structurally.
 *
 * `typeof import("playwright")` would be better typing and worse engineering:
 * it fails the type-check on every machine that does not have the optional
 * package, including CI and every deployment that cannot run captures. This
 * interface is small enough to read, and if it drifts from the real API the
 * capture fails at runtime on a deployment that has opted in -- behind a flag,
 * with a retryable error -- rather than failing everyone's build.
 */
type CaptureApiResponse = { status(): number; headers(): Record<string, string> };
type CaptureRoute = {
  request(): { url(): string; resourceType(): string };
  continue(): Promise<void>;
  abort(code?: string): Promise<void>;
  /** Performs the request without handing it to the browser. */
  fetch(options?: { maxRedirects?: number; url?: string }): Promise<CaptureApiResponse>;
  /** Hands a response back to the browser as if it had made the request. */
  fulfill(options: { response: CaptureApiResponse }): Promise<void>;
};
type CapturePage = {
  on(event: "dialog", fn: (dialog: { dismiss(): Promise<void> }) => void): void;
  goto(url: string, options: { waitUntil: "domcontentloaded"; timeout: number }): Promise<CaptureResponse | null>;
  title(): Promise<string>;
  url(): string;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(options: { type: "png"; fullPage: boolean }): Promise<Buffer>;
  evaluate<T>(fn: () => T): Promise<T>;
  close(): Promise<void>;
};
type CaptureResponse = { status(): number; headers(): Record<string, string> };
type CaptureContext = {
  route(pattern: string, handler: (route: CaptureRoute) => Promise<void> | void): Promise<void>;
  newPage(): Promise<CapturePage>;
  on(event: "page", fn: (page: CapturePage) => void): void;
};
type CaptureBrowser = {
  newContext(options: Record<string, unknown>): Promise<CaptureContext>;
  close(): Promise<void>;
};
type PlaywrightModule = {
  chromium: { launch(options: { args: string[] }): Promise<CaptureBrowser> };
};

/**
 * Loads Playwright, or reports that this deployment cannot capture.
 *
 * Kept as its own function so the route can answer "not available here"
 * without a stack trace, and so the reason is the same whether the package is
 * missing or the browser binary behind it is.
 */
async function loadPlaywright(): Promise<PlaywrightModule | null> {
  try {
    // A variable specifier keeps the bundler from trying to resolve this at
    // build time, which would fail the build on a deployment without it.
    const specifier = "playwright";
    return (await import(/* webpackIgnore: true */ specifier)) as PlaywrightModule;
  } catch {
    return null;
  }
}

export async function captureAvailable() {
  if (!captureFlagOn()) return false;
  return (await loadPlaywright()) !== null;
}

/**
 * Decides whether the browser may make one request.
 *
 * `seen` memoises per capture: a page makes hundreds of requests and most of
 * them repeat a handful of hosts, and a DNS lookup each time would dominate
 * the capture's time budget. The cache lives for one capture only, so a name
 * cannot be poisoned for a later one.
 */
export function hostGate(
  /**
   * How a hostname is judged. The default is the real resolver, and
   * production never passes anything else. It is injectable so the browser
   * wiring -- redirect hops, subresources, the abort itself -- can be tested
   * against a local server, which the real resolver would refuse before any
   * of that wiring ran. The resolver's own behaviour is covered separately in
   * tests/unit/url-safety.test.ts.
   */
  isBlocked: (hostname: string) => Promise<boolean> = isBlockedHost,
) {
  const seen = new Map<string, Promise<boolean>>();
  const refused = new Set<string>();
  return {
    refused,
    async allow(rawUrl: string) {
      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        return false;
      }
      // Nothing but ordinary web traffic. `data:` and `blob:` are generated by
      // the page itself and reach no network, so they are left alone.
      if (url.protocol === "data:" || url.protocol === "blob:") return true;
      if (url.protocol !== "http:" && url.protocol !== "https:") return false;

      const host = url.hostname;
      let check = seen.get(host);
      if (!check) {
        check = isBlocked(host).then((blocked) => !blocked);
        seen.set(host, check);
      }
      const allowed = await check;
      if (!allowed) refused.add(host);
      return allowed;
    },
  };
}

/**
 * The request guard the browser runs for every request it makes.
 *
 * Exported so the tests drive this function rather than a copy of it. The
 * first version of that test did wire up its own copy, which is how a
 * redirect bug survived it: the copy was correct and the real handler was not.
 *
 * ## Redirects, and two wrong answers before this one
 *
 * A plain `route.continue()` is wrong: Chromium follows a 3xx internally as
 * part of the same network request, so the handler is never consulted for the
 * target. A page at a perfectly public address answering
 * `302 Location: http://169.254.169.254/` put the browser on the cloud
 * metadata service with the gate none the wiser.
 *
 * Checking the `Location` and then handing the 3xx back is also wrong, and
 * this is the subtler one. Fulfilling a 3xx does not re-enter this handler --
 * measured, not assumed -- so the browser follows the whole remaining chain by
 * itself. A single hop was caught; a three-hop chain that turned inward only
 * at the last hop sailed through.
 *
 * So the chain is walked here instead. Every hop is resolved against the one
 * before it, gated, and fetched with redirects switched off, and only a final
 * non-redirect response is ever handed to the browser. The browser performs no
 * redirect of its own, which is the only version of this that holds.
 */
export function createRouteGuard(
  gate: ReturnType<typeof hostGate>,
  /** Where the top-level document ended up, for the capture to report. */
  onDocumentResolved?: (url: string) => void,
) {
  return async function guard(route: CaptureRoute) {
    const request = route.request();
    const isDocument = request.resourceType() === "document";
    let current = request.url();

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      if (!(await gate.allow(current))) return route.abort("blockedbyclient");

      let response: CaptureApiResponse;
      try {
        response = await route.fetch({ url: current, maxRedirects: 0 });
      } catch {
        // DNS failure, connection refused, TLS error: let the browser see a
        // failed request rather than hanging the capture.
        return route.abort("failed");
      }

      const status = response.status();
      const location = status >= 300 && status < 400 ? response.headers()["location"] : undefined;
      if (!location) {
        if (isDocument) onDocumentResolved?.(current);
        return route.fulfill({ response });
      }

      try {
        current = new URL(location, current).toString();
      } catch {
        // A Location that is not a URL at all.
        return route.abort("blockedbyclient");
      }
    }

    // A chain this long is either a loop or an attempt to tire the guard out.
    return route.abort("blockedbyclient");
  };
}

/**
 * Renders `target` and returns what was seen.
 *
 * The caller is expected to have rate-limited and slot-limited the request
 * already; a browser is far more expensive than a fetch.
 */
export async function capture(
  target: URL,
  viewportId: CaptureViewport,
  /**
   * The same seam as `hostGate`'s, for the same reason: the integration test
   * needs a page the real resolver would refuse before any of the code under
   * test runs. Production never passes this.
   */
  isBlocked: (hostname: string) => Promise<boolean> = isBlockedHost,
): Promise<CaptureOutcome> {
  if (!captureFlagOn()) {
    return {
      ok: false,
      reason: "unavailable",
      message: "Headless capture is not enabled on this deployment.",
      retryable: false,
    };
  }

  // The first check, before a browser is even started. The gate below repeats
  // it for the navigation itself, because this one can go stale.
  if (await isBlocked(target.hostname)) {
    return {
      ok: false,
      reason: "blocked",
      message: "Only public HTTP(S) addresses can be captured.",
      retryable: false,
    };
  }

  /*
   * Strip any credentials from the address.
   *
   * `http://user:secret@host/` would have the browser send Basic auth, which
   * contradicts the promise this capture makes in its own notes -- that it
   * runs in a clean browser with no sign-in, so a page behind a login shows
   * its signed-out state. It would also put the secret in `requestedUrl` and
   * `url`, which are returned to the client and could end up pasted into a
   * feedback report.
   */
  if (target.username || target.password) {
    target = new URL(target.toString());
    target.username = "";
    target.password = "";
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Headless capture needs a browser on the server, and this deployment does not have one.",
      retryable: false,
    };
  }

  const viewport = CAPTURE_VIEWPORTS[viewportId];
  const gate = hostGate(isBlocked);
  let browser: CaptureBrowser | null = null;

  try {
    browser = await playwright.chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    // A fresh context every time: no cookies, no storage, no credentials, and
    // nothing carried from the last capture into this one. This is what
    // "isolated from user credentials" means in practice -- CHROMIQ never has
    // the user's cookies, and the browser is not given any either.
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewportId === "mobile",
      hasTouch: viewportId === "mobile",
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
      userAgent: `Mozilla/5.0 (compatible; CHROMIQ capture/0.1; +headless)`,
      // No permissions at all: a page cannot ask for location, camera or
      // notifications and get them.
      permissions: [],
      serviceWorkers: "block",
    });

    // The guard walks redirect chains itself, so the browser's own address
    // never moves and `page.url()` would still report what was asked for.
    // This is where the chain actually ended.
    let resolvedUrl: string | null = null;
    await context.route("**/*", createRouteGuard(gate, (url) => {
      resolvedUrl = url;
    }));

    const page = await context.newPage();
    // A page that opens a dialog would otherwise block the capture until the
    // timeout; dismiss rather than wait.
    page.on("dialog", (dialog: { dismiss(): Promise<void> }) => void dialog.dismiss().catch(() => {}));
    // Popups and downloads are not part of a capture.
    context.on("page", (extra: CapturePage) => {
      if (extra !== page) void extra.close().catch(() => {});
    });

    let response;
    try {
      response = await page.goto(target.toString(), {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
    } catch (error) {
      const message = String((error as Error).message);
      if (/Timeout/i.test(message)) {
        return {
          ok: false,
          reason: "timeout",
          message: `The page did not load within ${NAVIGATION_TIMEOUT_MS / 1000} seconds.`,
          retryable: true,
        };
      }
      if (/blockedbyclient|ERR_BLOCKED/i.test(message)) {
        return {
          ok: false,
          reason: "blocked",
          message: "That address, or somewhere it redirected to, is not public.",
          retryable: false,
        };
      }
      return {
        ok: false,
        reason: "navigation",
        message: "The page could not be opened.",
        retryable: true,
      };
    }

    if (!response) {
      return {
        ok: false,
        reason: "navigation",
        message: "The page did not respond.",
        retryable: true,
      };
    }
    if (response.status() >= 400) {
      return {
        ok: false,
        reason: "upstream-status",
        message: `The page responded with HTTP ${response.status()}.`,
        retryable: response.status() >= 500,
      };
    }
    const contentType = String(response.headers()["content-type"] ?? "");
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      return {
        ok: false,
        reason: "not-html",
        message: "That address did not return a web page.",
        retryable: false,
      };
    }

    // Give client-rendered pages a moment to paint. `networkidle` is not used:
    // a page with polling or a live connection never reaches it, and this is
    // meant to produce a consistent view rather than a perfect one.
    await page.waitForTimeout(SETTLE_MS);

    const title = (await page.title().catch(() => "")).slice(0, 200);
    const { colors, fonts } = await readComputedDesign(page);

    const screenshot = await page.screenshot({ type: "png", fullPage: false });

    const finalUrl: string = resolvedUrl ?? page.url();
    const notes = [
      "Rendered in a real browser with scripts on, so this is what the page actually paints.",
      "Captured from a clean browser with no cookies and no sign-in, so anything behind a login shows its signed-out state.",
      `Measured at ${viewport.label}; a different size may use different styles.`,
    ];
    if (gate.refused.size) {
      notes.push(
        "Some requests were refused for pointing at private addresses, so parts of the page may be missing.",
      );
    }

    return {
      ok: true,
      capture: {
        sourceType: "headless capture",
        requestedUrl: target.toString(),
        url: finalUrl,
        capturedAt: new Date().toISOString(),
        viewport: { id: viewportId, ...viewport },
        title,
        screenshot: screenshot.toString("base64"),
        colors,
        fonts,
        refusedHosts: [...gate.refused].slice(0, MAX_REFUSED_REPORTED),
        notes,
      },
    };
  } catch (error) {
    const message = String((error as Error).message);
    if (/Target closed|crash/i.test(message)) {
      return {
        ok: false,
        reason: "crashed",
        message: "The browser stopped before the page could be captured.",
        retryable: true,
      };
    }
    return {
      ok: false,
      reason: "navigation",
      message: "The capture did not complete.",
      retryable: true,
    };
  } finally {
    await browser?.close().catch(() => {});
  }
}

/**
 * Reads the palette and type off the rendered page.
 *
 * This is the reason to run a browser at all. The scripts-off inspector parses
 * CSS text and guesses which rules won; here the browser has already decided,
 * so what comes back is what is actually on screen, weighted by how much of
 * the page each value covers.
 */
async function readComputedDesign(
  page: Pick<CapturePage, "evaluate">,
): Promise<{ colors: string[]; fonts: string[] }> {
  try {
    return await page.evaluate(() => {
      const MAX_NODES = 4000;
      const area = new Map<string, number>();
      const faces = new Map<string, number>();

      const toHex = (value: string) => {
        const match = value.match(/^rgba?\(([^)]+)\)$/);
        if (!match) return null;
        const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
        // A fully transparent paint covers nothing.
        if (parts[3] !== undefined && parts[3] === 0) return null;
        return (
          "#" +
          parts
            .slice(0, 3)
            .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
            .join("")
        );
      };

      const add = (map: Map<string, number>, key: string | null, weight: number) => {
        if (!key || weight <= 0) return;
        map.set(key, (map.get(key) ?? 0) + weight);
      };

      const nodes = Array.from(document.body?.querySelectorAll("*") ?? []).slice(0, MAX_NODES);
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.opacity === "0") continue;

        // Weight a background by the area it paints and text by how much of it
        // there is, so a huge empty wrapper does not outvote the body copy.
        add(area, toHex(style.backgroundColor), rect.width * rect.height);
        const own = Array.from(node.childNodes)
          .filter((child) => child.nodeType === 3)
          .reduce((total, child) => total + (child.textContent?.trim().length ?? 0), 0);
        if (own > 0) {
          add(area, toHex(style.color), own * 200);
          const family = style.fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
          add(faces, family || null, own);
        }
      }

      const rank = (map: Map<string, number>, limit: number) =>
        [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key]) => key);

      return { colors: rank(area, 12), fonts: rank(faces, 6) };
    });
  } catch {
    // A page that navigated away mid-read, or a strict policy on evaluation.
    // The screenshot is still worth returning.
    return { colors: [], fonts: [] };
  }
}
