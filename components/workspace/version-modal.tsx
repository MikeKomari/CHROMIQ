import { useState } from "react";
import { Eye, Plus, RotateCcw, Trash2, X } from "lucide-react";
import type { Version } from "@/types/workspace";

export function VersionModal({
  versions,
  commitVersion,
  restoreVersion,
  deleteVersion,
  compareVersion,
  close,
}: {
  versions: Version[];
  commitVersion: (name?: string) => Version | undefined;
  restoreVersion: (version: Version) => void;
  deleteVersion: (id: string) => void;
  compareVersion: (version: Version) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    commitVersion(draft);
    setDraft("");
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="version-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Version history</span>
            <h2>Commit the working state.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close version history"
          >
            <X size={17} />
          </button>
        </div>
        <div className="version-commit">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
            }}
            placeholder="Version name (optional)"
            aria-label="Version name"
          />
          <button className="primary-button" onClick={commit}>
            <Plus size={15} /> Commit current
          </button>
        </div>
        <div className="snapshot-list">
          {versions.length ? (
            versions.map((version) => (
              <div className="snapshot-item" key={version.id}>
                <div className="snapshot-info">
                  <strong>{version.name}</strong>
                  <small>
                    {new Date(version.createdAt).toLocaleString()} ·{" "}
                    {version.mode} preview
                  </small>
                </div>
                <div className="snapshot-actions">
                  <button
                    className="icon-button"
                    onClick={() => compareVersion(version)}
                    aria-label={`Compare ${version.name}`}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => restoreVersion(version)}
                    aria-label={`Restore ${version.name}`}
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => deleteVersion(version.id)}
                    aria-label={`Delete ${version.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No versions yet. Commit the working state before a big change.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
