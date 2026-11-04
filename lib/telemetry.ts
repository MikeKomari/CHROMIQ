/**
 * Client-side reporting for CHROMIQ-1005.
 *
 * Nothing here identifies anyone: an event carries a name, a reason, a short
 * message and a number, and the server adds only a timestamp and the release.
 * There is no id, no cookie and no fingerprint, so two visits from the same
 * browser are indistinguishable.
 *
 * Reports are batched and flushed with sendBeacon, which the browser delivers
 * after the page is gone. That matters for the case this exists for: an error
 * the user reacts to by closing the tab.
 */

export type ClientEvent = {
  kind: "error" | "failure" | "vital" | "feature";
  name: string;
  reason?: string;
  detail?: string;
  value?: number;
};

const ENDPOINT = "/api/telemetry";
const MAX_QUEUE = 20;
const FLUSH_DELAY_MS = 2000;
const MAX_DETAIL = 500;

/**
 * Off unless switched on. Next inlines this at build time, so a deployment
 * without it never ships the listeners below, let alone a request.
 */
function enabled() {
  const raw = process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY?.trim().toLowerCase();
  return raw === "on" || raw === "1" || raw === "true";
}

let queue: ClientEvent[] = [];
let timer: number | null = null;
let listening = false;

function send(events: ClientEvent[]) {
  if (!events.length) return;
  const body = JSON.stringify({ events });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // A beacon survives the page being closed, which is when the error that
      // caused it is most likely to be reported.
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    // keepalive gives fetch the same survive-unload behaviour where sendBeacon
    // is missing or refused the payload.
    void fetch(ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting must never throw into the code it is reporting on */
  }
}

function flush() {
  // A pending flush can land while the page is being torn down, when the
  // globals it reaches for may already be gone. This is the error reporter:
  // it throwing during teardown would be its own bug report, and there would
  // be nothing left to deliver it.
  try {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  } catch {
    timer = null;
  }
  const batch = queue;
  queue = [];
  send(batch);
}

/**
 * Flush on the way out as well as on a timer. `visibilitychange` is the one
 * event mobile browsers reliably fire before discarding a tab; `pagehide`
 * covers the back/forward cache.
 */
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const onHidden = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", flush);
}

export function report(event: ClientEvent) {
  if (!enabled() || typeof window === "undefined") return;
  listen();
  // Drop rather than grow without bound: a render loop throwing every frame
  // must not turn into a memory leak on top of the bug it already is.
  if (queue.length >= MAX_QUEUE) return;
  queue.push({
    ...event,
    detail: event.detail ? event.detail.slice(0, MAX_DETAIL) : undefined,
  });
  if (event.kind === "error") {
    // An error may be the last thing that happens on this page; do not wait.
    flush();
    return;
  }
  if (timer === null) timer = window.setTimeout(flush, FLUSH_DELAY_MS);
}

/**
 * Reports an error from a React error boundary.
 *
 * `digest` is Next's hash of the server-side error. Sending it is what makes a
 * client report useful: it is the only thing that ties "the user saw the
 * recovery screen" to the stack in the host's server log.
 */
export function reportBoundaryError(
  name: string,
  error: Error & { digest?: string },
) {
  report({
    kind: "error",
    name,
    reason: error.name || "Error",
    detail: [error.digest ? `digest=${error.digest}` : null, error.message]
      .filter(Boolean)
      .join(" "),
  });
}

/** Reports a client-side failure with a known reason, not an exception. */
export function reportFailure(name: string, reason: string, detail?: string) {
  report({ kind: "failure", name, reason, detail });
}

/** Reports that a feature was used. Carries no payload beyond its own name. */
export function reportFeature(name: string) {
  report({ kind: "feature", name });
}
