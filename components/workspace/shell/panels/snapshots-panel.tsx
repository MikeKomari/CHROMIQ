import type { Snapshot } from "@/types/workspace";

export function SnapshotsPanel({
  snapshots,
  restoreSnapshot,
  manage,
  readOnly,
}: {
  snapshots: Snapshot[];
  restoreSnapshot: (snapshot: Snapshot) => void;
  manage: () => void;
  readOnly: boolean;
}) {
  return (
    <>
      {snapshots.length > 0 && (
        <ul className="panel-list" aria-label="Snapshots">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id}>
              <button
                type="button"
                className="panel-row"
                title={`Restore ${snapshot.name}`}
                disabled={readOnly}
                onClick={() => restoreSnapshot(snapshot)}
              >
                <span className="panel-row-swatch" style={{ background: snapshot.tokens.accent }} />
                <span className="panel-row-name">{snapshot.name}</span>
                <span className="panel-row-meta">{new Date(snapshot.createdAt).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {snapshots.length === 0 && (
        <p className="panel-empty">No snapshots yet. Use + to keep the current direction.</p>
      )}
      <button type="button" className="panel-manage" onClick={manage}>
        Manage snapshots
      </button>
    </>
  );
}
