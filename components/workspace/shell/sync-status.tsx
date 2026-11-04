"use client";

import {
  Cloud,
  CloudAlert,
  CloudOff,
  CloudUpload,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { SyncState } from "@/hooks/use-cloud-sync";

/** Server messages are whole sentences, so joining them raw doubles the stop. */
function sentence(text: string | null, fallback: string) {
  return (text ?? fallback).replace(/\.\s*$/, "");
}

/**
 * Cloud sync state in the top bar, beside the local save state.
 *
 * The two are kept apart on purpose: "Saved locally" and "Synced" answer
 * different questions, and collapsing them into one indicator is how a failed
 * autosave ends up looking like a successful save.
 *
 * The control is a button in every state that has something to do -- turning
 * sync on, retrying a failed save, resolving a conflict -- so a failure is
 * reachable by keyboard and not just visible.
 */
export function SyncStatus({
  state,
  error,
  syncedAt,
  readOnly,
  linkProject,
  retry,
  openConflict,
}: {
  state: SyncState;
  error: string | null;
  syncedAt: string | null;
  readOnly: boolean;
  linkProject: () => void;
  retry: () => void;
  openConflict: () => void;
}) {
  if (state === "off") return null;

  if (state === "conflict") {
    return (
      <button
        type="button"
        className="sync-state is-conflict"
        onClick={openConflict}
        aria-label="This project changed elsewhere. Choose which version to keep"
        title="This project changed on another device"
      >
        <CloudAlert size={15} />
        <span className="sync-label">Needs review</span>
      </button>
    );
  }

  if (state === "error") {
    return (
      <button
        type="button"
        className="sync-state is-error"
        onClick={retry}
        aria-label={`Sync failed: ${sentence(error, "the reason is not known")}. Retry.`}
        title={error ?? "Sync failed"}
      >
        <RefreshCw size={15} />
        <span className="sync-label">Sync failed — retry</span>
      </button>
    );
  }

  if (state === "saving") {
    return (
      <span className="sync-state is-saving" role="status">
        <Loader2 size={15} className="spin" />
        <span className="sync-label">Syncing</span>
      </span>
    );
  }

  if (state === "synced") {
    const when = syncedAt ? new Date(syncedAt) : null;
    return (
      <span
        className="sync-state is-synced"
        role="status"
        title={when ? `Last synced ${when.toLocaleTimeString()}` : "Synced to your account"}
      >
        <Cloud size={15} />
        <span className="sync-label">Synced</span>
      </span>
    );
  }

  // "local": signed in, but this project has not been put in the account yet.
  return (
    <button
      type="button"
      className="sync-state is-local"
      onClick={linkProject}
      disabled={readOnly}
      aria-label="Sync this project to your account"
      title={
        readOnly
          ? "Read-only shared system"
          : "Sync this project to your account so you can open it in another browser"
      }
    >
      {readOnly ? <CloudOff size={15} /> : <CloudUpload size={15} />}
      <span className="sync-label">Sync this project</span>
    </button>
  );
}
