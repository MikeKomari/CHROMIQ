import { Globe2, LoaderCircle, Search, X } from "lucide-react";
import { useState } from "react";

type Inspection = {
  url: string;
  sourceType: string;
  title: string;
  headings: string[];
  colors: string[];
  confidence: string;
  note: string;
};

export function InspectModal({ close }: { close: () => void }) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Inspection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inspect = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/inspect?url=${encodeURIComponent(url)}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The URL could not be inspected.");
      setResult(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The URL could not be inspected.",
      );
    } finally {
      setLoading(false);
    }
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
          PRISM fetches public HTML and reconstructs a token hint. It never
          presents the result as the original live page.
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
