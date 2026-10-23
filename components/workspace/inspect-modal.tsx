import {
  Check,
  Globe2,
  Info,
  LoaderCircle,
  Search,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Tokens } from "@/types/workspace";

type Confidence = "high" | "medium" | "low";
type Suggestion = {
  tokens: Partial<Tokens>;
  confidence: Record<"color" | "type" | "shape", Confidence>;
  notes: string[];
};
type GroupKey = "light" | "dark" | "type" | "shape";

const groups: {
  key: GroupKey;
  label: string;
  family: "color" | "type" | "shape";
  keys: { token: keyof Tokens; label: string }[];
}[] = [
  {
    key: "light",
    label: "Light",
    family: "color",
    keys: [
      { token: "paper", label: "Background" },
      { token: "ink", label: "Text" },
      { token: "muted", label: "Muted text" },
      { token: "line", label: "Line" },
      { token: "accent", label: "Accent" },
      { token: "accentSoft", label: "Accent soft" },
    ],
  },
  {
    key: "dark",
    label: "Dark",
    family: "color",
    keys: [
      { token: "darkPaper", label: "Background" },
      { token: "darkInk", label: "Text" },
      { token: "darkMuted", label: "Muted text" },
      { token: "darkLine", label: "Line" },
      { token: "darkAccent", label: "Accent" },
      { token: "darkAccentSoft", label: "Accent soft" },
    ],
  },
  {
    key: "type",
    label: "Type",
    family: "type",
    keys: [
      { token: "displayFont", label: "Display" },
      { token: "bodyFont", label: "Body" },
      { token: "monoFont", label: "Mono" },
    ],
  },
  {
    key: "shape",
    label: "Shape",
    family: "shape",
    keys: [{ token: "radius", label: "Corner radius" }],
  },
];

type Inspection = {
  url: string;
  sourceType: string;
  title: string;
  headings: string[];
  colors: string[];
  confidence: string;
  note: string;
  stylesheets: { fetched: number; failed: number };
  suggestion: Suggestion;
  clientRendered: boolean;
};

export function InspectModal({
  close,
  restyle,
  apply,
  readOnly = false,
  locked = [],
}: {
  close: () => void;
  restyle: (url: string) => void;
  apply: (tokens: Partial<Tokens>) => void;
  readOnly?: boolean;
  locked?: string[];
}) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<GroupKey, boolean>>({
    light: true,
    dark: true,
    type: true,
    shape: true,
  });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const inspect = async () => {
    // A newer request replaces any still-running one, so a stale response can't overwrite it.
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/inspect?url=${encodeURIComponent(url)}`,
        { signal: current.signal },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object")
        throw new Error(
          [
            (data && typeof data.error === "string" && data.error) ||
              "The URL could not be inspected. The server sent an unexpected reply.",
            Number(response.headers.get("Retry-After")) > 0
              ? `Try again in ${Math.ceil(Number(response.headers.get("Retry-After")))} seconds.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      setSelected({ light: true, dark: true, type: true, shape: true });
      setResult(data);
    } catch (reason) {
      if (current.signal.aborted) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "The URL could not be inspected.",
      );
    } finally {
      if (controller.current === current) setLoading(false);
    }
  };
  const available = result
    ? groups.filter((group) =>
        group.keys.some(({ token }) => result.suggestion.tokens[token] !== undefined),
      )
    : [];
  const chosen = available.filter((group) => selected[group.key]);
  const skippedLocked: string[] = [];
  const subset: Partial<Tokens> = {};
  if (result)
    for (const group of chosen)
      for (const { token, label } of group.keys) {
        const value = result.suggestion.tokens[token];
        if (value === undefined) continue;
        if (locked.includes(token)) skippedLocked.push(`${group.label} ${label.toLowerCase()}`);
        else Object.assign(subset, { [token]: value });
      }
  const canApply = !readOnly && Object.keys(subset).length > 0;
  const applySelected = () => {
    if (!canApply) return;
    apply(subset);
    close();
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="inspect-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Public URL inspection</span>
            <h2>Look closer, honestly.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close inspection"
          >
            <X size={17} />
          </button>
        </div>
        <p className="modal-copy">
          CHROMIQ fetches public HTML and its stylesheets, never runs the
          page&apos;s scripts, and reconstructs a token hint. It never presents
          the result as the original live page.
        </p>
        <div className="inspect-input">
          <Globe2 size={16} />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            onKeyDown={(event) => event.key === "Enter" && inspect()}
          />
          <button
            className="primary-button"
            onClick={inspect}
            disabled={loading || !url}
          >
            {loading ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Search size={15} />
            )}{" "}
            Inspect
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        {result && (
          <div className="inspection-result">
            <div className="inspection-meta">
              <span className="pass-badge">{result.sourceType}</span>
              <span>{result.confidence} confidence</span>
            </div>
            <h3>{result.title || "Untitled page"}</h3>
            <p>{result.note}</p>
            <p className="inspection-sheets">
              {result.stylesheets.fetched} stylesheet
              {result.stylesheets.fetched === 1 ? "" : "s"} read
              {result.stylesheets.failed > 0 &&
                `, ${result.stylesheets.failed} could not be fetched`}
              .
            </p>
            {result.clientRendered && (
              <div className="inspect-notice" role="note">
                <Info size={15} />
                <span>
                  Built with JavaScript — CHROMIQ read its stylesheets, but the
                  page itself can&apos;t be shown without scripts.
                </span>
              </div>
            )}
            {available.length ? (
              <div className="suggestion">
                <span className="eyebrow">Suggested tokens</span>
                {available.map((group) => (
                  <fieldset className="suggestion-group" key={group.key}>
                    <legend className="sr-only">{group.label}</legend>
                    <label className="suggestion-head">
                      <input
                        className="settings-checkbox"
                        type="checkbox"
                        checked={selected[group.key]}
                        onChange={(event) =>
                          setSelected((current) => ({
                            ...current,
                            [group.key]: event.target.checked,
                          }))
                        }
                      />
                      <strong>{group.label}</strong>
                      <span>
                        {result.suggestion.confidence[group.family]} confidence
                      </span>
                    </label>
                    <ul>
                      {group.keys.map(({ token, label }) => {
                        const value = result.suggestion.tokens[token];
                        if (value === undefined) return null;
                        const isColor = typeof value === "string" && value.startsWith("#");
                        return (
                          <li key={token}>
                            {isColor && (
                              <span
                                className="suggestion-swatch"
                                style={{ background: value }}
                              />
                            )}
                            <span>{label}</span>
                            <code>
                              {token === "radius" ? `${value}px` : String(value)}
                            </code>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ))}
              </div>
            ) : (
              <p className="muted-result">
                No design tokens could be read from this page.
              </p>
            )}
            {result.suggestion.notes.length > 0 && (
              <ul className="suggestion-notes">
                {result.suggestion.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
            {readOnly && (
              <p className="muted-result" role="note">
                This is a shared, read-only view, so tokens can&apos;t be applied here.
              </p>
            )}
            {!readOnly && skippedLocked.length > 0 && (
              <p className="muted-result" role="note">
                Locked tokens stay as they are: {skippedLocked.join(", ")}.
              </p>
            )}
            <div className="inspect-actions">
              <button
                className="primary-button"
                onClick={applySelected}
                disabled={!canApply}
              >
                <Check size={15} /> Apply to tokens
              </button>
              <button
                className="secondary-button"
                onClick={() => restyle(result.url)}
              >
                <Wand2 size={15} /> Restyle this page
              </button>
            </div>
            <div className="inspection-columns">
              <div>
                <span className="eyebrow">Headings</span>
                {result.headings.length ? (
                  result.headings.map((heading) => (
                    <span className="result-chip" key={heading}>
                      {heading}
                    </span>
                  ))
                ) : (
                  <span className="muted-result">None found</span>
                )}
              </div>
              <div>
                <span className="eyebrow">Colors found</span>
                <div className="color-dots">
                  {result.colors.map((color) => (
                    <span
                      key={color}
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
