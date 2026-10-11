import { useState } from "react";
import {
  BookmarkPlus,
  Check,
  Copy,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Snapshot } from "@/types/workspace";

export function SnapshotModal({
  snapshots,
  createSnapshot,
  restoreSnapshot,
  renameSnapshot,
  duplicateSnapshot,
  deleteSnapshot,
  close,
}: {
  snapshots: Snapshot[];
  createSnapshot: (name?: string) => Snapshot;
  restoreSnapshot: (snapshot: Snapshot) => void;
  renameSnapshot: (id: string, name: string) => void;
  duplicateSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  close: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const startRename = (snapshot: Snapshot) => {
    setEditingId(snapshot.id);
    setDraft(snapshot.name);
  };
  const commitRename = () => {
    if (editingId) renameSnapshot(editingId, draft);
    setEditingId(null);
  };
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="snapshot-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Snapshots</span>
            <h2>Save the good directions.</h2>
          </div>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close snapshots"
          >
            <X size={17} />
          </button>
        </div>
        <button
          className="randomize-button snapshot-create"
          onClick={() => createSnapshot()}
        >
          <BookmarkPlus size={16} />
          <span>
            <strong>Save current direction</strong>
            <small>Capture the active tokens and preview mode</small>
          </span>
        </button>
        <div className="snapshot-list">
          {snapshots.length ? (
            snapshots.map((snapshot) => (
              <div className="snapshot-item" key={snapshot.id}>
                <div className="snapshot-info">
                  {editingId === snapshot.id ? (
                    <input
                      className="snapshot-rename"
                      value={draft}
                      autoFocus
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      aria-label="Rename snapshot"
                    />
                  ) : (
                    <strong>{snapshot.name}</strong>
                  )}
                  <small>
                    {new Date(snapshot.createdAt).toLocaleString()} ·{" "}
                    {snapshot.mode} preview
                  </small>
                </div>
                <div className="snapshot-actions">
                  {editingId === snapshot.id ? (
                    <button
                      className="icon-button"
                      onClick={commitRename}
                      aria-label="Confirm rename"
                    >
                      <Check size={15} />
                    </button>
                  ) : (
                    <button
                      className="icon-button"
                      onClick={() => startRename(snapshot)}
                      aria-label={`Rename ${snapshot.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    onClick={() => duplicateSnapshot(snapshot.id)}
                    aria-label={`Duplicate ${snapshot.name}`}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => restoreSnapshot(snapshot)}
                    aria-label={`Restore ${snapshot.name}`}
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => deleteSnapshot(snapshot.id)}
                    aria-label={`Delete ${snapshot.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              No snapshots yet. Keep a direction here before you move on.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
