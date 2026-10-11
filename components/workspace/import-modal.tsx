import { FileInput, FileJson, FileText, Upload, X } from "lucide-react";
import { useState } from "react";

type ImportKind = "css" | "tailwind" | "json";

export function ImportModal({
  importTokens,
  warnings,
  close,
}: {
  importTokens: (kind: ImportKind, source: string) => { warnings: string[] };
  warnings: string[];
  close: () => void;
}) {
  const [kind, setKind] = useState<ImportKind>("css");
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const runImport = () => {
    const result = importTokens(kind, source);
    setMessage(
      result.warnings.length ? "Imported with notes" : "Tokens imported",
    );
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="import-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Bring a system in</span>
            <h2>Start from what you have.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close import"
          >
            <X size={17} />
          </button>
        </div>
        <div className="import-tabs">
          <button
            className={kind === "css" ? "active" : ""}
            onClick={() => setKind("css")}
          >
            <FileText size={14} /> CSS
          </button>
          <button
            className={kind === "tailwind" ? "active" : ""}
            onClick={() => setKind("tailwind")}
          >
            <FileInput size={14} /> Tailwind
          </button>
          <button
            className={kind === "json" ? "active" : ""}
            onClick={() => setKind("json")}
          >
            <FileJson size={14} /> JSON
          </button>
        </div>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={
            kind === "json"
              ? '{"accent":"#d5ff42","radius":12}'
              : kind === "tailwind"
                ? "theme: { colors: { ... } }"
                : ":root { --prism-accent: #d5ff42; }"
          }
        />
        <div className="import-footer">
          <span>
            {message || "Paste a token file or configuration snippet."}
          </span>
          <div className="import-actions">
            <label className="secondary-button file-button">
              <FileInput size={15} /> Choose file
              <input
                type="file"
                accept={
                  kind === "json" ? ".json,application/json" : ".css,text/css"
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setKind(file.name.endsWith(".json") ? "json" : "css");
                  const reader = new FileReader();
                  reader.onload = () => setSource(String(reader.result || ""));
                  reader.readAsText(file);
                }}
              />
            </label>
            <button className="primary-button" onClick={runImport}>
              <Upload size={15} /> Import tokens
            </button>
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="import-warnings">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
