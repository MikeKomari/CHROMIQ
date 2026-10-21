import {
  Braces,
  Copy,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Layers3,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { ExportFiles } from "@/lib/exporters";

export function ExportModal({
  exportFiles,
  exportWarnings,
  exportErrors,
  copied,
  copyExport,
  downloadExport,
  close,
  initialFormat = "css",
}: {
  exportFiles: ExportFiles;
  exportWarnings: string[];
  exportErrors: string[];
  copied: boolean;
  copyExport: (content?: string) => Promise<void>;
  downloadExport: (content?: string, filename?: string, type?: string) => void;
  close: () => void;
  initialFormat?: keyof ExportFiles;
}) {
  const [format, setFormat] = useState<keyof ExportFiles>(initialFormat);
  const tabRefs = useRef<Partial<Record<keyof ExportFiles, HTMLButtonElement | null>>>({});
  const labels: Record<keyof ExportFiles, string> = {
    css: "CSS",
    tailwind: "Tailwind",
    shadcn: "shadcn/ui",
    design: "DESIGN.md",
    json: "JSON",
    project: "Project file",
    dtcg: "Design Tokens",
  };
  const icons: Record<keyof ExportFiles, React.ReactNode> = {
    css: <FileCode2 size={14} />,
    tailwind: <Layers3 size={14} />,
    shadcn: <FileText size={14} />,
    design: <FileText size={14} />,
    json: <FileJson size={14} />,
    project: <FileJson size={14} />,
    dtcg: <Braces size={14} />,
  };
  const keys = Object.keys(labels) as Array<keyof ExportFiles>;
  const selectTab = (key: keyof ExportFiles) => {
    setFormat(key);
    tabRefs.current[key]?.focus();
  };
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const index = keys.indexOf(format);
    const next =
      event.key === "ArrowRight" ? (index + 1) % keys.length
      : event.key === "ArrowLeft" ? (index - 1 + keys.length) % keys.length
      : event.key === "Home" ? 0
      : event.key === "End" ? keys.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    selectTab(keys[next]);
  };
  const isJson = format === "json" || format === "project" || format === "dtcg";
  const filename =
    format === "dtcg" ? "prism.tokens.json" : `prism-${format}.${format === "design" ? "md" : isJson ? "json" : "css"}`;
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="export-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Export system</span>
            <h2>Take PRISM with you.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close export"
          >
            <X size={17} />
          </button>
        </div>
        <div
          className="export-tabs"
          role="tablist"
          aria-label="Export format"
          onKeyDown={onTabKeyDown}
        >
          {keys.map((key) => (
            <button
              key={key}
              ref={(node) => {
                tabRefs.current[key] = node;
              }}
              id={`export-tab-${key}`}
              role="tab"
              aria-selected={format === key}
              aria-controls="export-panel"
              tabIndex={format === key ? 0 : -1}
              className={format === key ? "active" : ""}
              onClick={() => setFormat(key)}
            >
              {icons[key]} {labels[key]}
            </button>
          ))}
        </div>
        <pre
          id="export-panel"
          role="tabpanel"
          tabIndex={0}
          aria-label={`${labels[format]} export`}
        >
          {exportFiles[format]}
        </pre>
        {exportWarnings.length > 0 && (
          <div className="export-warnings">
            <span className="eyebrow">Review before shipping</span>
            {exportWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
        {exportErrors.length > 0 && (
          <div className="export-warnings">
            <span className="eyebrow">Blocked from download</span>
            {exportErrors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={() => copyExport(exportFiles[format])}
          >
            <Copy size={15} /> {copied ? "Copied" : "Copy code"}
          </button>
          <button
            className="primary-button"
            disabled={exportErrors.length > 0}
            onClick={() =>
              downloadExport(
                exportFiles[format],
                filename,
                isJson
                  ? "application/json"
                  : format === "design"
                    ? "text/markdown"
                    : "text/css",
              )
            }
          >
            <Download size={15} /> Download {labels[format]}
          </button>
        </div>
      </section>
    </div>
  );
}
