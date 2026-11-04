/**
 * The join between a project in this browser and its row in the cloud.
 *
 * Local projects are created offline with their own id, and the server mints
 * its own uuid on insert, so the two cannot share one identifier. This module
 * owns the mapping, plus the last revision this browser successfully wrote.
 *
 * The revision is what makes concurrent edits safe: `PUT /api/projects/[id]`
 * only lands when the revision it is given still matches the row, so a stale
 * browser is told it is stale instead of flattening the other device's work.
 * Keeping it in localStorage means that still holds after a reload.
 */

import type { Mode, Project, Snapshot, Tokens } from "@/types/workspace";
import { normalizeTokens } from "@/lib/tokens";

const KEY = "chromiq-cloud-links";

export type CloudLink = {
  /** The project's uuid on the server. */
  cloudId: string;
  /** The revision this browser last wrote or read. */
  revision: number;
  /** ISO timestamp of the last successful write from this browser. */
  syncedAt: string;
};

export type CloudLinks = Record<string, CloudLink>;

/** The shape stored in the `data` column. Deliberately not the whole Project:
 *  `id` and `updatedAt` belong to whichever side is holding it. */
export type CloudProjectData = {
  schemaVersion: 1;
  tokens: Tokens;
  mode: Mode;
  starter: string;
  snapshots: Snapshot[];
};

export const CLOUD_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readLinks(): CloudLinks {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const links: CloudLinks = {};
    for (const [localId, value] of Object.entries(parsed)) {
      if (!isRecord(value)) continue;
      const { cloudId, revision, syncedAt } = value;
      if (typeof cloudId !== "string" || !Number.isInteger(revision)) continue;
      links[localId] = {
        cloudId,
        revision: revision as number,
        syncedAt: typeof syncedAt === "string" ? syncedAt : "",
      };
    }
    return links;
  } catch {
    // A blocked or corrupted store means "nothing is linked yet", which costs
    // at worst a duplicate row, never a lost edit.
    return {};
  }
}

function write(links: CloudLinks) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(links));
  } catch {
    /* storage unavailable; sync still works for this session */
  }
}

export function saveLink(localId: string, link: CloudLink) {
  const links = readLinks();
  links[localId] = link;
  write(links);
}

export function forgetLink(localId: string) {
  const links = readLinks();
  if (!(localId in links)) return;
  delete links[localId];
  write(links);
}

/** The local id a cloud row is linked to in this browser, if any. */
export function localIdFor(cloudId: string): string | null {
  for (const [localId, link] of Object.entries(readLinks())) {
    if (link.cloudId === cloudId) return localId;
  }
  return null;
}

export function toCloudData(project: Omit<Project, "id" | "updatedAt">): CloudProjectData {
  return {
    schemaVersion: CLOUD_SCHEMA_VERSION,
    tokens: project.tokens,
    mode: project.mode,
    starter: project.starter,
    snapshots: project.snapshots,
  };
}

/**
 * Turns a row's `data` back into a project this browser can open.
 *
 * Anything could be in that column: a payload written by an older build, or by
 * a newer one after the user upgrades on another device. Every field is
 * checked and defaulted rather than trusted, because a bad value here lands in
 * React state and takes the whole workspace into the recovery screen.
 */
export function fromCloudData(
  data: unknown,
  meta: { id: string; name: string; updatedAt: string },
): Project {
  const record = isRecord(data) ? data : {};
  const mode = record.mode === "light" ? "light" : "dark";
  const snapshots = Array.isArray(record.snapshots)
    ? (record.snapshots.filter(
        (item) => isRecord(item) && typeof item.id === "string",
      ) as Snapshot[])
    : [];
  return {
    id: meta.id,
    name: meta.name,
    updatedAt: meta.updatedAt,
    // normalizeTokens drops known tokens carrying the wrong type, so a row
    // written by an older build, a newer one, or a tampered request cannot
    // put a non-string where a font name belongs.
    tokens: normalizeTokens((isRecord(record.tokens) ? record.tokens : {}) as Partial<Tokens>),
    mode,
    starter: typeof record.starter === "string" ? record.starter : "Editorial",
    snapshots,
  };
}
