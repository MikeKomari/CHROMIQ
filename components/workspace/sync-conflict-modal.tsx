"use client";

import { useEffect, useId, useRef } from "react";
import { CloudAlert, X } from "lucide-react";
import type { SyncConflict } from "@/hooks/use-cloud-sync";

/**
 * What happens when the same project was edited in two places.
 *
 * The server refused the write rather than taking it, so at this point nothing
 * has been lost on either side -- and nothing will be until someone chooses.
 * That is the whole point of the dialog: it does not pick a winner, it does
 * not merge, and it does not close itself. There is no "last write wins" path
 * through this screen.
 */
export function SyncConflictModal({
  conflict,
  keepMine,
  useTheirs,
  close,
}: {
  conflict: SyncConflict;
  keepMine: () => void;
  useTheirs: () => void;
  close: () => void;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    return () => trigger?.focus();
  }, []);

  const theirs = conflict.theirs;

  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="project-modal sync-conflict"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">
              <CloudAlert size={13} /> Sync conflict
            </span>
            <h2 id={titleId}>This project changed somewhere else.</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close sync conflict">
            <X size={17} />
          </button>
        </div>
        <p className="modal-copy" id={bodyId}>
          Another browser or device saved this project after you opened it here.
          Nothing has been overwritten. Choose which version to keep, or close
          this and carry on working locally — syncing stays paused until you
          decide.
        </p>
        <div className="conflict-options">
          <div className="conflict-option">
            <h3>Keep this version</h3>
            <p>
              What is open in this browser becomes the version in your account.
              The other save is replaced.
            </p>
            <button ref={firstRef} type="button" className="primary-button" onClick={keepMine}>
              Keep what is open here
            </button>
          </div>
          <div className="conflict-option">
            <h3>Take the other version</h3>
            <p>
              {theirs
                ? `Opens "${theirs.name}", saved ${new Date(theirs.updatedAt).toLocaleString()}. Unsaved work in this browser is replaced.`
                : "The other version could not be read just now. Try again once you are back online."}
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={useTheirs}
              disabled={!theirs}
            >
              Take the other version
            </button>
          </div>
        </div>
        <p className="conflict-note">
          Either way, you can export the current system first from the export
          panel — that copy never leaves this browser.
        </p>
      </section>
    </div>
  );
}
