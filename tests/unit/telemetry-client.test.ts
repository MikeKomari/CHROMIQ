import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The client reporter runs inside the failure it is reporting on, so the
 * cases that matter are the ugly ones: it must not throw, it must not grow
 * without bound while a render loop keeps failing, and it must get an error
 * out before the tab closes.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY;

type Listener = () => void;

const sendBeacon = vi.fn(() => true);
let listeners: Record<string, Listener[]>;

function setUpDom() {
  listeners = {};
  const add = (type: string, fn: Listener) => {
    (listeners[type] ??= []).push(fn);
  };
  vi.stubGlobal("navigator", { sendBeacon });
  vi.stubGlobal("Blob", class {
    constructor(readonly parts: string[]) {}
  });
  vi.stubGlobal("document", {
    visibilityState: "visible",
    addEventListener: add,
  });
  vi.stubGlobal("window", {
    addEventListener: add,
    setTimeout: (fn: () => void) => setTimeout(fn, 0) as unknown as number,
    clearTimeout: (id: number) => clearTimeout(id),
  });
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
}

function fire(type: string) {
  for (const fn of listeners[type] ?? []) fn();
}

function sentBodies() {
  return sendBeacon.mock.calls.map(
    (call) => JSON.parse(((call as unknown[])[1] as { parts: string[] }).parts[0]) as {
      events: Record<string, unknown>[];
    },
  );
}

async function load() {
  vi.resetModules();
  return import("@/lib/telemetry");
}

beforeEach(() => {
  sendBeacon.mockClear();
  setUpDom();
  process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY = "on";
});

afterEach(() => {
  // Any debounce still pending would otherwise fire after the globals below
  // are torn down.
  fire("pagehide");
  vi.unstubAllGlobals();
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY;
  else process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY = ORIGINAL;
});

describe("when telemetry is off", () => {
  it("sends nothing at all", async () => {
    process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY = "off";
    const { report, reportFeature } = await load();
    report({ kind: "error", name: "boom" });
    reportFeature("export.css");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("registers no page listeners", async () => {
    process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY = "off";
    const { report } = await load();
    report({ kind: "vital", name: "LCP", value: 1 });
    expect(Object.keys(listeners)).toHaveLength(0);
  });
});

describe("report", () => {
  it("flushes an error immediately, because the tab may be closing", async () => {
    const { report } = await load();
    report({ kind: "error", name: "boom", reason: "TypeError" });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sentBodies()[0].events[0]).toMatchObject({ kind: "error", name: "boom" });
  });

  it("batches everything else until the page is hidden", async () => {
    const { report } = await load();
    report({ kind: "vital", name: "LCP", value: 1 });
    report({ kind: "vital", name: "CLS", value: 0 });
    expect(sendBeacon).not.toHaveBeenCalled();

    (globalThis as { document: { visibilityState: string } }).document.visibilityState = "hidden";
    fire("visibilitychange");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sentBodies()[0].events).toHaveLength(2);
  });

  it("ignores a visibilitychange back to visible", async () => {
    const { report } = await load();
    report({ kind: "vital", name: "LCP", value: 1 });
    fire("visibilitychange");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("flushes on pagehide, for the back/forward cache", async () => {
    const { report } = await load();
    report({ kind: "feature", name: "export.css" });
    fire("pagehide");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when the queue is empty", async () => {
    const { report } = await load();
    report({ kind: "vital", name: "LCP", value: 1 });
    fire("pagehide");
    sendBeacon.mockClear();
    fire("pagehide");
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("drops events past the queue cap instead of growing", async () => {
    // A component throwing every frame must not become a memory leak on top
    // of the bug it already is.
    const { report } = await load();
    for (let i = 0; i < 500; i++) report({ kind: "feature", name: `f${i}` });
    fire("pagehide");
    expect(sentBodies()[0].events.length).toBeLessThanOrEqual(20);
  });

  it("truncates detail before it leaves the browser", async () => {
    const { report } = await load();
    report({ kind: "error", name: "boom", detail: "x".repeat(5000) });
    expect((sentBodies()[0].events[0].detail as string).length).toBe(500);
  });

  it("falls back to fetch when sendBeacon refuses the payload", async () => {
    sendBeacon.mockReturnValueOnce(false);
    const { report } = await load();
    report({ kind: "error", name: "boom" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({ method: "POST", keepalive: true }),
    );
  });

  it("does not throw when the page is torn down under a pending flush", async () => {
    // The debounce timer can outlive the page. flush() reaches for window to
    // clear it, and that must not become an exception.
    const { report } = await load();
    report({ kind: "vital", name: "LCP", value: 1 });
    const pageHide = listeners.pagehide[0];
    vi.unstubAllGlobals();
    expect(() => pageHide()).not.toThrow();
    setUpDom();
  });

  it("does not throw when sendBeacon itself throws", async () => {
    sendBeacon.mockImplementationOnce(() => {
      throw new Error("blocked by the browser");
    });
    const { report } = await load();
    expect(() => report({ kind: "error", name: "boom" })).not.toThrow();
  });
});

describe("reportBoundaryError", () => {
  it("sends the error name and message", async () => {
    const { reportBoundaryError } = await load();
    const error = Object.assign(new TypeError("x is not a function"), {});
    reportBoundaryError("root-boundary", error);
    expect(sentBodies()[0].events[0]).toMatchObject({
      kind: "error",
      name: "root-boundary",
      reason: "TypeError",
    });
    expect(sentBodies()[0].events[0].detail).toContain("x is not a function");
  });

  it("includes the digest, which is what ties this to the server log", async () => {
    const { reportBoundaryError } = await load();
    const error = Object.assign(new Error("boom"), { digest: "1234567890" });
    reportBoundaryError("workspace-boundary", error);
    expect(sentBodies()[0].events[0].detail).toContain("digest=1234567890");
  });

  it("copes with an error carrying no message", async () => {
    const { reportBoundaryError } = await load();
    reportBoundaryError("root-boundary", new Error());
    expect(sentBodies()[0].events[0]).toMatchObject({ reason: "Error" });
  });
});
