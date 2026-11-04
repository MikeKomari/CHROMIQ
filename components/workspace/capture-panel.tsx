"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";

type ViewportId = "desktop" | "tablet" | "mobile";

type Capture = {
  sourceType: string;
  requestedUrl: string;
  url: string;
  capturedAt: string;
  viewport: { id: ViewportId; width: number; height: number; label: string };
  title: string;
  screenshot: string;
  colors: string[];
  fonts: string[];
  refusedHosts: string[];
  notes: string[];
};

const VIEWPORTS: { id: ViewportId; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

/**
 * Headless capture, inside the inspect dialog (CHROMIQ-702).
 *
 * This is a third preview state, and the product rule is that the three are
 * never blurred together: the DOM preview is honest about being CHROMIQ's own
 * surfaces, the reconstructed preview is honest about being a guess, and this
 * one is a photograph of someone else's page at a moment in time. It is
 * labelled as such and is deliberately not editable.
 *
 * The whole panel hides itself when the server says no browser is available,
 * rather than offering a control that answers 501.
 */
export function CapturePanel({
  url,
  onColors,
  readOnly,
}: {
  url: string;
  /** Hands the measured palette to the caller to apply as tokens. */
  onColors?: (colors: string[]) => void;
  readOnly: boolean;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [capture, setCapture] = useState<Capture | null>(null);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capture")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setAvailable(Boolean(data?.available));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async () => {
    if (!url) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/capture?url=${encodeURIComponent(url)}&viewport=${viewport}`,
        { signal: current.signal },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.capture) {
        setError({
          message:
            (typeof data?.error === "string" && data.error) ||
            "The page could not be captured.",
          // The server says whether trying again is worth anything; a blocked
          // address will be blocked next time too.
          retryable: data?.retryable !== false,
        });
        setCapture(null);
        return;
      }
      setCapture(data.capture as Capture);
    } catch {
      if (current.signal.aborted) return;
      setError({ message: "Could not reach the server.", retryable: true });
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }, [url, viewport]);

  // Nothing to say until the probe answers, and nothing to offer if the
  // deployment has no browser.
  if (available !== true) return null;

  return (
    <section className="capture-panel" aria-labelledby="capture-heading">
      <div className="capture-head">
        <h3 id="capture-heading">
          <Camera size={15} aria-hidden="true" /> Capture with a browser
        </h3>
        <label className="toolbar-select">
          <span className="sr-only">Capture size</span>
          <select
            value={viewport}
            onChange={(event) => setViewport(event.target.value as ViewportId)}
            disabled={loading}
          >
            {VIEWPORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary-button"
          onClick={() => void run()}
          disabled={loading || !url}
        >
          {loading ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <Camera size={15} aria-hidden="true" />
          )}
          {loading ? "Capturing" : "Capture"}
        </button>
      </div>
      <p className="capture-copy">
        Runs the page in a real browser with scripts on, so a site built with
        JavaScript shows what it actually paints. Slower than the inspection
        above, and it is a photograph rather than something you can edit.
      </p>

      {error && (
        <div className="error-message" role="alert">
          {error.message}
          {error.retryable && (
            <button type="button" className="mini-text-button" onClick={() => void run()}>
              <RefreshCw size={13} aria-hidden="true" /> Try again
            </button>
          )}
        </div>
      )}

      {capture && (
        <div className="capture-result">
          <div className="inspection-meta">
            <span className="pass-badge">{capture.sourceType}</span>
            <span>{capture.viewport.label}</span>
            <time dateTime={capture.capturedAt}>
              {new Date(capture.capturedAt).toLocaleString()}
            </time>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a base64 capture of
              a third-party page, not an asset the image optimizer can handle. */}
          <img
            className="capture-shot"
            src={`data:image/png;base64,${capture.screenshot}`}
            alt={`Screenshot of ${capture.title || capture.url} at ${capture.viewport.label}`}
            width={capture.viewport.width}
            height={capture.viewport.height}
          />
          <p className="capture-url">
            <strong>{capture.title || "Untitled page"}</strong>
            <br />
            <code>{capture.url}</code>
            {capture.url !== capture.requestedUrl && " (after a redirect)"}
          </p>

          {capture.refusedHosts.length > 0 && (
            <div className="inspect-notice" role="note">
              <ShieldAlert size={15} aria-hidden="true" />
              <span>
                Requests to {capture.refusedHosts.join(", ")} were refused for
                pointing at private addresses, so parts of this page are
                missing.
              </span>
            </div>
          )}

          {capture.colors.length > 0 && (
            <div className="capture-measured">
              <span className="eyebrow">Measured from the render</span>
              <ul className="capture-swatches">
                {capture.colors.map((color) => (
                  <li key={color}>
                    <span className="suggestion-swatch" style={{ background: color }} />
                    <code>{color}</code>
                  </li>
                ))}
              </ul>
              {capture.fonts.length > 0 && (
                <p className="capture-fonts">Type: {capture.fonts.join(", ")}</p>
              )}
              {onColors && (
                <button
                  type="button"
                  className="secondary-button"
                  disabled={readOnly}
                  onClick={() => onColors(capture.colors)}
                  title={readOnly ? "Read-only shared system" : undefined}
                >
                  Use these colours
                </button>
              )}
            </div>
          )}

          <ul className="capture-notes">
            {capture.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
