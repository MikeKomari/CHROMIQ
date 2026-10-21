import { Eye } from "lucide-react";
import type { Version } from "@/types/workspace";

export function VersionsPanel({
  versions,
  restoreVersion,
  compareVersion,
  manage,
  readOnly,
}: {
  versions: Version[];
  restoreVersion: (version: Version) => void;
  compareVersion: (version: Version) => void;
  manage: () => void;
  readOnly: boolean;
}) {
  return (
    <>
      {versions.length > 0 && (
        <ul className="panel-list" aria-label="Versions">
          {versions.map((version) => (
            <li key={version.id} className="panel-row-split">
              <button
                type="button"
                className="panel-row"
                title={`Restore ${version.name}`}
                disabled={readOnly}
                onClick={() => restoreVersion(version)}
              >
                <span className="panel-row-swatch" style={{ background: version.tokens.accent }} />
                <span className="panel-row-name">{version.name}</span>
                <span className="panel-row-meta">{new Date(version.createdAt).toLocaleDateString()}</span>
              </button>
              <button
                type="button"
                className="mini-button"
                aria-label={`Compare ${version.name}`}
                title={`Compare ${version.name}`}
                onClick={() => compareVersion(version)}
              >
                <Eye size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {versions.length === 0 && (
        <p className="panel-empty">No versions yet. Use + to commit the working state.</p>
      )}
      <button type="button" className="panel-manage" onClick={manage}>
        Manage versions
      </button>
    </>
  );
}
