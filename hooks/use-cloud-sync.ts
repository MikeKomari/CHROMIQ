"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProject as apiCreate,
  deleteProject as apiDelete,
  listProjects,
  updateProject as apiUpdate,
  type SyncedProject,
} from "@/lib/sync";
import {
  forgetLink,
  fromCloudData,
  readLinks,
  saveLink,
  toCloudData,
  type CloudLink,
} from "@/lib/cloud-links";
import type { Project } from "@/types/workspace";

/**
 * Cloud sync for the project open in the workbench (CHROMIQ-802).
 *
 * Three rules shape this hook, and they are the ticket's acceptance criteria:
 *
 * 1. Ownership is the server's business. Nothing here tries to decide who may
 *    read a project; the routes scope every statement by `user_id`.
 * 2. A failed autosave is never silent. The status this hook returns is
 *    rendered in the top bar, and `retry` re-runs the push that failed.
 * 3. A concurrent edit never disappears. The server rejects a write whose
 *    revision has moved on, and this hook stops and asks rather than
 *    re-pushing with the newer revision, which would be a silent overwrite
 *    wearing a different hat.
 *
 * Syncing is opt-in per project. A project starts local, and `link` pushes it
 * to the account for the first time; after that every edit autosaves. Without
 * the opt-in, every throwaway "Untitled system" would claim one of the user's
 * 200 server-side slots.
 */

export type SyncState =
  | "off" // no account, or accounts are not enabled on this deployment
  | "local" // signed in, but this project is not synced
  | "saving"
  | "synced"
  | "error"
  | "conflict";

export type SyncConflict = {
  /** The revision the server holds now, which this browser has not seen. */
  revision: number;
  /** What the other device saved, ready to open here. */
  theirs: Project | null;
};

/** The project as the workbench currently holds it. */
export type SyncableProject = Omit<Project, "updatedAt">;

const DEBOUNCE_MS = 2500;

export function useCloudSync({
  enabled,
  readOnly,
  project,
  onReplaceProject,
}: {
  enabled: boolean;
  readOnly: boolean;
  project: SyncableProject;
  /** Called when the user chooses the other device's version. */
  onReplaceProject: (project: Project) => void;
}) {
  const [link, setLink] = useState<CloudLink | null>(null);
  const [state, setState] = useState<SyncState>("off");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [remote, setRemote] = useState<SyncedProject[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // The payload is compared as a string so an edit that lands back on the same
  // values does not spend a request, and so the effect below depends on one
  // stable scalar rather than on a freshly built object every render.
  const payload = useMemo(
    () => JSON.stringify({ name: project.name, data: toCloudData(project) }),
    [project],
  );
  const lastPushed = useRef<string | null>(null);

  // Read in an effect, not during render: localStorage does not exist on the
  // server, and reading it while rendering would mismatch hydration.
  useEffect(() => {
    if (!enabled) {
      setLink(null);
      return;
    }
    setLink(readLinks()[project.id] ?? null);
    // A different project is a different sync target; drop the previous
    // project's error and conflict rather than showing them against this one.
    setError(null);
    setConflict(null);
    lastPushed.current = null;
  }, [enabled, project.id]);

  useEffect(() => {
    if (!enabled) setState("off");
    else if (conflict) setState("conflict");
    else if (error) setState("error");
    else if (!link) setState("local");
    else setState("synced");
    // `saving` is set directly by the push, so it is not derived here.
  }, [enabled, link, error, conflict]);

  const push = useCallback(
    async (body: string, currentLink: CloudLink) => {
      const { name, data } = JSON.parse(body) as { name: string; data: object };
      setState("saving");
      const result = await apiUpdate(currentLink.cloudId, name, data, currentLink.revision);

      if (result.ok) {
        const next: CloudLink = {
          cloudId: currentLink.cloudId,
          revision: result.data.project.revision,
          syncedAt: new Date().toISOString(),
        };
        saveLink(project.id, next);
        setLink(next);
        setError(null);
        lastPushed.current = body;
        setState("synced");
        return;
      }

      if (result.status === 409) {
        // Somebody else saved first. Stop here: re-pushing with their revision
        // is exactly the silent overwrite this guard exists to prevent.
        const fresh = await listProjects();
        const row = fresh.ok
          ? fresh.data.projects.find((item) => item.id === currentLink.cloudId)
          : undefined;
        setConflict({
          revision: row?.revision ?? currentLink.revision + 1,
          theirs: row
            ? fromCloudData(row.data, {
                id: project.id,
                name: row.name,
                updatedAt: row.updated_at,
              })
            : null,
        });
        setState("conflict");
        return;
      }

      if (result.status === 404) {
        // The project was deleted on another device. Keep the work here and
        // drop the link, so the next opt-in creates a fresh row.
        forgetLink(project.id);
        setLink(null);
        setError("This project is no longer in your account. It is still saved in this browser.");
        return;
      }

      setError(result.error);
      setState("error");
    },
    [project.id],
  );

  // Autosave. Debounced, because a slider drag produces a change per frame and
  // each one would otherwise be a write.
  useEffect(() => {
    if (!enabled || readOnly || !link || conflict) return;
    if (payload === lastPushed.current) return;
    const timer = window.setTimeout(() => void push(payload, link), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, readOnly, link, conflict, payload, push]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoadingRemote(true);
    const result = await listProjects();
    setLoadingRemote(false);
    if (result.ok) setRemote(result.data.projects);
    else setError(result.error);
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
    else setRemote([]);
  }, [enabled, refresh]);

  /** First push: creates the row and links this project to it. */
  const linkProject = useCallback(async () => {
    if (!enabled || readOnly) return false;
    setState("saving");
    setError(null);
    const result = await apiCreate(project.name, toCloudData(project));
    if (!result.ok) {
      setError(result.error);
      setState("error");
      return false;
    }
    const next: CloudLink = {
      cloudId: result.data.project.id,
      revision: result.data.project.revision,
      syncedAt: new Date().toISOString(),
    };
    saveLink(project.id, next);
    setLink(next);
    lastPushed.current = JSON.stringify({ name: project.name, data: toCloudData(project) });
    setState("synced");
    void refresh();
    return true;
  }, [enabled, readOnly, project, refresh]);

  /** Stops syncing this project. The row stays; this browser just lets go. */
  const unlinkProject = useCallback(() => {
    forgetLink(project.id);
    setLink(null);
    setError(null);
    setConflict(null);
  }, [project.id]);

  const retry = useCallback(() => {
    setError(null);
    if (!link) {
      void linkProject();
      return;
    }
    void push(payload, link);
  }, [link, linkProject, payload, push]);

  /** Keep what is open here and overwrite the other device's save. */
  const resolveKeepMine = useCallback(() => {
    if (!conflict || !link) return;
    const at: CloudLink = { ...link, revision: conflict.revision };
    setConflict(null);
    saveLink(project.id, at);
    setLink(at);
    void push(payload, at);
  }, [conflict, link, payload, project.id, push]);

  /** Discard what is open here and take the other device's save. */
  const resolveUseTheirs = useCallback(() => {
    if (!conflict?.theirs || !link) return;
    const at: CloudLink = {
      ...link,
      revision: conflict.revision,
      syncedAt: new Date().toISOString(),
    };
    saveLink(project.id, at);
    setLink(at);
    onReplaceProject(conflict.theirs);
    // The replacement is what the server already holds, so nothing to push.
    lastPushed.current = JSON.stringify({
      name: conflict.theirs.name,
      data: toCloudData(conflict.theirs),
    });
    setConflict(null);
    setError(null);
  }, [conflict, link, onReplaceProject, project.id]);

  /** Opens a project from the account in this browser. */
  const openRemote = useCallback(
    (row: SyncedProject) => {
      const opened = fromCloudData(row.data, {
        // Reuse the local id the row was linked to, if this browser has one,
        // so opening a project twice does not fork it into two local copies.
        id: readLinks()[project.id]?.cloudId === row.id ? project.id : row.id,
        name: row.name,
        updatedAt: row.updated_at,
      });
      saveLink(opened.id, {
        cloudId: row.id,
        revision: row.revision,
        syncedAt: new Date().toISOString(),
      });
      onReplaceProject(opened);
    },
    [onReplaceProject, project.id],
  );

  /** Removes a project from the account. The local copy is untouched. */
  const deleteRemote = useCallback(
    async (row: SyncedProject) => {
      const result = await apiDelete(row.id);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setRemote((current) => current.filter((item) => item.id !== row.id));
      if (link?.cloudId === row.id) unlinkProject();
      return true;
    },
    [link, unlinkProject],
  );

  return {
    state,
    error,
    conflict,
    remote,
    loadingRemote,
    linked: Boolean(link),
    syncedAt: link?.syncedAt ?? null,
    linkProject,
    unlinkProject,
    retry,
    refresh,
    resolveKeepMine,
    resolveUseTheirs,
    openRemote,
    deleteRemote,
  };
}
