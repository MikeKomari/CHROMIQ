import { ArrowLeft, ExternalLink, Globe2, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Tokens, View, Viewport } from "@/types/workspace";
import { RestyleControls } from "./restyle-controls";
import {
  createRestyleEngine,
  type PaletteEntry,
  type RestyleEngine,
} from "./restyle-engine";
import { useRestyleState } from "./use-restyle-state";

type Page = { url: string; title: string; html: string; notes: string[] };
type Status = "idle" | "loading" | "error" | "ready";
export type RestyleRequest = { url: string; id: number };

const VIEWPORT_WIDTH: Record<Viewport, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 390,
  custom: null,
};

function withRetry(message: string, retryAfter: string | null) {
  const seconds = Number(retryAfter);
  return Number.isFinite(seconds) && seconds > 0
    ? `${message} Try again in ${Math.ceil(seconds)} seconds.`
    : message;
}

export function RestyleView({
  tokens,
  viewport,
  setViewport,
  customWidth,
  setView,
  request,
  consumeRequest,
}: {
  tokens: Tokens;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  customWidth: number;
  setView: (view: View) => void;
  request: RestyleRequest | null;
  consumeRequest: () => void;
}) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [notesOpen, setNotesOpen] = useState(true);
  const [pendingLink, setPendingLink] = useState("");
  const [engine, setEngine] = useState<RestyleEngine | null>(null);
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [loadId, setLoadId] = useState(0);
  const lastUrl = useRef("");
  const requestSeq = useRef(0);
  const guardCleanup = useRef<(() => void) | null>(null);
  const restyle = useRestyleState();
  const { state, commit, undo, redo, clear } = restyle;

  const load = useCallback(
    async (rawUrl: string) => {
      const url = rawUrl.trim();
      if (!url) return;
      const seq = ++requestSeq.current;
      lastUrl.current = url;
      setInput(url);
      setStatus("loading");
      setError("");
      setPendingLink("");
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        const data = await response.json().catch(() => ({}));
        if (seq !== requestSeq.current) return;
        if (!response.ok)
          throw new Error(
            withRetry(data.error || "The page could not be loaded.", response.headers.get("Retry-After")),
          );
        guardCleanup.current?.();
        guardCleanup.current = null;
        setEngine(null);
        setPalette([]);
        clear();
        setPage(data as Page);
        setNotesOpen(true);
        setInput((data as Page).url);
        setLoadId((id) => id + 1);
        setStatus("ready");
      } catch (reason) {
        if (seq !== requestSeq.current) return;
        guardCleanup.current?.();
        guardCleanup.current = null;
        setEngine(null);
        setPalette([]);
        setPage(null);
        setError(reason instanceof Error ? reason.message : "The page could not be loaded.");
        setStatus("error");
      }
    },
    [clear],
  );

  useEffect(() => {
    if (!request) return;
    consumeRequest();
    void load(request.url);
  }, [request, consumeRequest, load]);

  useEffect(() => () => guardCleanup.current?.(), []);

  useEffect(() => {
    engine?.apply(state);
  }, [engine, state]);

  const onFrameLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    const doc = event.currentTarget.contentDocument;
    guardCleanup.current?.();
    guardCleanup.current = null;
    const created = doc ? createRestyleEngine(doc) : null;
    if (!doc || !created) {
      setEngine(null);
      setPalette([]);
      setPage(null);
      setError("The preview frame navigated away or could not be read.");
      setStatus("error");
      return;
    }
    const removeGuard = created.guardLinks(setPendingLink);
    const onKey = (keyEvent: KeyboardEvent) => handleUndoKey(keyEvent);
    doc.addEventListener("keydown", onKey);
    guardCleanup.current = () => {
      removeGuard();
      doc.removeEventListener("keydown", onKey);
    };
    setPalette(created.palette);
    setEngine(created);
  };

  const undoRef = useRef({ undo, redo });
  undoRef.current = { undo, redo };
  function handleUndoKey(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (/^(input|textarea|select)$/i.test(target.tagName) || target.isContentEditable))
      return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) undoRef.current.redo();
      else undoRef.current.undo();
    } else if (key === "y") {
      event.preventDefault();
      undoRef.current.redo();
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleUndoKey);
    return () => window.removeEventListener("keydown", handleUndoKey);
  }, []);

  const width = viewport === "custom" ? customWidth : VIEWPORT_WIDTH[viewport];
  const ready = status === "ready" && page !== null;

  return (
    <section className="restyle-view" aria-label="Restyle a website">
      <div className="restyle-topbar">
        <button className="restyle-back" onClick={() => setView("canvas")}>
          <ArrowLeft size={14} /> Canvas
        </button>
        <form
          className="restyle-urlbar"
          onSubmit={(event) => {
            event.preventDefault();
            void load(input);
          }}
        >
          <Globe2 size={15} aria-hidden="true" />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="https://example.com"
            aria-label="Website URL"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="restyle-load" disabled={status === "loading" || !input.trim()}>
            {status === "loading" ? <LoaderCircle className="spin" size={14} /> : null} Load
          </button>
        </form>
        <span className="restyle-chip">Proxied preview · scripts off</span>
        {page && (
          <a className="restyle-link" href={page.url} target="_blank" rel="noopener noreferrer">
            open original <ExternalLink size={12} />
          </a>
        )}
        <label className="restyle-viewport">
          <span className="sr-only">Preview viewport</span>
          <select
            value={viewport}
            onChange={(event) => setViewport(event.target.value as Viewport)}
            aria-label="Preview viewport"
          >
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobile</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>
      {ready && page.notes.length > 0 && notesOpen && (
        <div className="restyle-notice" role="note">
          <ul>
            {page.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <button className="icon-button" onClick={() => setNotesOpen(false)} aria-label="Dismiss notes">
            <X size={14} />
          </button>
        </div>
      )}
      {pendingLink && (
        <div className="restyle-notice restyle-link-notice">
          <span>
            Links are disabled in the preview. <code>{pendingLink}</code>
          </span>
          <button className="restyle-load" onClick={() => void load(pendingLink)}>
            Load this page
          </button>
          <button className="icon-button" onClick={() => setPendingLink("")} aria-label="Dismiss link notice">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="restyle-body">
        <div className="restyle-stage">
          {status === "idle" && (
            <div className="restyle-empty">
              <Globe2 size={22} aria-hidden="true" />
              <h2>Restyle any website</h2>
              <p>
                Paste a public URL. CHROMIQ loads a scripts-off copy of the page so you can change its
                type and colors, then copy the CSS. It is a static preview, not the live site.
              </p>
              <button className="restyle-load" onClick={() => void load("https://example.com")}>
                Try example.com
              </button>
            </div>
          )}
          {status === "loading" && (
            <div className="restyle-empty" role="status">
              <LoaderCircle className="spin" size={22} aria-hidden="true" />
              <p>Fetching and cleaning the page…</p>
            </div>
          )}
          {status === "error" && (
            <div className="restyle-empty" role="alert">
              <h2>Could not load that page</h2>
              <p>{error}</p>
              <button className="restyle-load" onClick={() => void load(lastUrl.current)}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}
          {ready && (
            <div className="restyle-frame-wrap" style={width ? { maxWidth: width } : undefined}>
              <iframe
                key={loadId}
                className="restyle-frame"
                title={page.title ? `Preview of ${page.title}` : "Website preview"}
                sandbox="allow-same-origin"
                referrerPolicy="no-referrer"
                srcDoc={page.html}
                onLoad={onFrameLoad}
              />
            </div>
          )}
        </div>
        <RestyleControls
          state={state}
          commit={commit}
          palette={palette}
          tokens={tokens}
          disabled={!ready || !engine}
          canUndo={restyle.canUndo}
          canRedo={restyle.canRedo}
          undo={undo}
          redo={redo}
          getCss={() => (engine && page ? engine.exportCss(state, page.url) : "")}
        />
      </div>
    </section>
  );
}
