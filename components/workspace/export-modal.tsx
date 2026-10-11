import {
  Copy,
  Download,
  FileCode2,
  FileJson,
  FileText,
  Layers3,
  X,
} from "lucide-react";
import { useState } from "react";

type ExportFiles = {
  css: string;
  tailwind: string;
  shadcn: string;
  design: string;
  json: string;
  project: string;
};

export function ExportModal({
  exportFiles,
  exportWarnings,
  exportErrors,
  copied,
  copyExport,
  downloadExport,
  close,
}: {
  exportFiles: ExportFiles;
  exportWarnings: string[];
  exportErrors: string[];
  copied: boolean;
  copyExport: (content?: string) => Promise<void>;
  downloadExport: (content?: string, filename?: string, type?: string) => void;
  close: () => void;
}) {
  const [format, setFormat] = useState<keyof ExportFiles>("css");
  const labels: Record<keyof ExportFiles, string> = {
    css: "CSS",
    tailwind: "Tailwind",
    shadcn: "shadcn/ui",
    design: "DESIGN.md",
    json: "JSON",
    project: "Project file",
  };
  const icons: Record<keyof ExportFiles, React.ReactNode> = {
    css: <FileCode2 size={14} />,
    tailwind: <Layers3 size={14} />,
    shadcn: <FileText size={14} />,
    design: <FileText size={14} />,
    json: <FileJson size={14} />,
    project: <FileJson size={14} />,
  };
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
        <div className="export-tabs">
          {(Object.keys(labels) as Array<keyof ExportFiles>).map((key) => (
            <button
              key={key}
              className={format === key ? "active" : ""}
              onClick={() => setFormat(key)}
            >
              {icons[key]} {labels[key]}
            </button>
          ))}
        </div>
        <pre>{exportFiles[format]}</pre>
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
                `prism-${format}.${format === "design" ? "md" : format === "json" || format === "project" ? "json" : "css"}`,
                format === "json" || format === "project"
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
