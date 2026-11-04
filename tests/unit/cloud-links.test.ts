import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLOUD_SCHEMA_VERSION,
  forgetLink,
  fromCloudData,
  localIdFor,
  readLinks,
  saveLink,
  toCloudData,
} from "@/lib/cloud-links";
import { defaultTokens } from "@/data/workspace";
import type { Project } from "@/types/workspace";

/**
 * This module decides whether a cloud write is allowed to land, so its failure
 * paths matter more than its happy path: a dropped revision turns optimistic
 * concurrency off, and a bad `data` column reaches React state.
 */

const KEY = "chromiq-cloud-links";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function useStorage(storage: Storage) {
  vi.stubGlobal("window", { localStorage: storage });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("readLinks", () => {
  it("returns nothing when storage is empty", () => {
    useStorage(fakeStorage());
    expect(readLinks()).toEqual({});
  });

  it("returns nothing when storage throws", () => {
    useStorage({
      getItem: () => {
        throw new DOMException("blocked");
      },
    } as unknown as Storage);
    // A private window costs at worst a duplicate row, never a lost edit.
    expect(readLinks()).toEqual({});
  });

  it("ignores unparseable JSON", () => {
    useStorage(fakeStorage({ [KEY]: "{not json" }));
    expect(readLinks()).toEqual({});
  });

  it("ignores a payload that is not an object", () => {
    useStorage(fakeStorage({ [KEY]: '"a string"' }));
    expect(readLinks()).toEqual({});
  });

  it("drops entries with no cloud id", () => {
    useStorage(fakeStorage({ [KEY]: JSON.stringify({ local: { revision: 2 } }) }));
    expect(readLinks()).toEqual({});
  });

  it("drops entries whose revision is not an integer", () => {
    // A missing or fractional revision would be sent to the server as-is and
    // rejected, or worse, coerced -- so the link is not trusted at all.
    useStorage(
      fakeStorage({
        [KEY]: JSON.stringify({
          a: { cloudId: "c1" },
          b: { cloudId: "c2", revision: 1.5 },
          c: { cloudId: "c3", revision: "4" },
          d: { cloudId: "c4", revision: 4 },
        }),
      }),
    );
    expect(Object.keys(readLinks())).toEqual(["d"]);
  });

  it("defaults a missing syncedAt rather than dropping a usable link", () => {
    useStorage(fakeStorage({ [KEY]: JSON.stringify({ a: { cloudId: "c1", revision: 3 } }) }));
    expect(readLinks().a).toEqual({ cloudId: "c1", revision: 3, syncedAt: "" });
  });
});

describe("saveLink and forgetLink", () => {
  it("round-trips a link", () => {
    useStorage(fakeStorage());
    saveLink("local-1", { cloudId: "c1", revision: 7, syncedAt: "2026-01-01T00:00:00.000Z" });
    expect(readLinks()["local-1"].revision).toBe(7);
  });

  it("does not throw when storage is full", () => {
    useStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
    } as unknown as Storage);
    expect(() =>
      saveLink("local-1", { cloudId: "c1", revision: 1, syncedAt: "" }),
    ).not.toThrow();
  });

  it("forgetting an unknown id is a no-op", () => {
    useStorage(fakeStorage());
    expect(() => forgetLink("never-linked")).not.toThrow();
    expect(readLinks()).toEqual({});
  });

  it("forgets only the link asked for", () => {
    useStorage(fakeStorage());
    saveLink("a", { cloudId: "c1", revision: 1, syncedAt: "" });
    saveLink("b", { cloudId: "c2", revision: 1, syncedAt: "" });
    forgetLink("a");
    expect(Object.keys(readLinks())).toEqual(["b"]);
  });
});

describe("localIdFor", () => {
  it("finds the local project a row is linked to", () => {
    useStorage(fakeStorage());
    saveLink("local-9", { cloudId: "cloud-9", revision: 1, syncedAt: "" });
    expect(localIdFor("cloud-9")).toBe("local-9");
  });

  it("returns null for a row this browser has never seen", () => {
    useStorage(fakeStorage());
    expect(localIdFor("cloud-missing")).toBeNull();
  });
});

describe("toCloudData", () => {
  it("carries the schema version so an older build can be recognised", () => {
    const data = toCloudData({
      name: "x",
      tokens: defaultTokens,
      mode: "dark",
      starter: "Editorial",
      snapshots: [],
    });
    expect(data.schemaVersion).toBe(CLOUD_SCHEMA_VERSION);
  });

  it("leaves out the identity fields, which belong to whichever side holds it", () => {
    const data = toCloudData({
      name: "x",
      tokens: defaultTokens,
      mode: "light",
      starter: "Archive",
      snapshots: [],
    }) as Record<string, unknown>;
    expect(data).not.toHaveProperty("id");
    expect(data).not.toHaveProperty("updatedAt");
    expect(data).not.toHaveProperty("name");
  });
});

describe("fromCloudData", () => {
  const meta = { id: "local-1", name: "Synced", updatedAt: "2026-02-02T00:00:00.000Z" };

  it("reads a payload this build wrote", () => {
    const project: Omit<Project, "id" | "updatedAt"> = {
      name: "Synced",
      tokens: { ...defaultTokens, accent: "#123456" },
      mode: "light",
      starter: "Signal",
      snapshots: [],
    };
    const back = fromCloudData(toCloudData(project), meta);
    expect(back.tokens.accent).toBe("#123456");
    expect(back.mode).toBe("light");
    expect(back.starter).toBe("Signal");
  });

  it("falls back to a usable project when the column is not an object", () => {
    // The row could have been written by anything; a bad value here would
    // otherwise render and take the workspace into the recovery screen.
    const back = fromCloudData("nonsense", meta);
    expect(back.mode).toBe("dark");
    expect(back.starter).toBe("Editorial");
    expect(back.snapshots).toEqual([]);
    expect(typeof back.tokens.accent).toBe("string");
  });

  it("refuses a mode outside the two the theme table knows", () => {
    expect(fromCloudData({ mode: "sepia" }, meta).mode).toBe("dark");
    expect(fromCloudData({ mode: null }, meta).mode).toBe("dark");
  });

  it("drops snapshots that are not snapshot-shaped", () => {
    const back = fromCloudData(
      { snapshots: [{ id: "s1" }, "nope", null, { name: "no id" }] },
      meta,
    );
    expect(back.snapshots).toHaveLength(1);
    expect(back.snapshots[0].id).toBe("s1");
  });

  it("treats a non-array snapshots field as empty", () => {
    expect(fromCloudData({ snapshots: { a: 1 } }, meta).snapshots).toEqual([]);
  });

  it("normalizes tokens rather than trusting them", () => {
    const back = fromCloudData({ tokens: { accent: "not-a-colour", radius: "huge" } }, meta);
    expect(back.tokens.accent).toMatch(/^#/);
    expect(typeof back.tokens.radius).toBe("number");
  });

  it("takes identity from the caller, not from the payload", () => {
    const back = fromCloudData({ id: "spoofed", name: "spoofed", starter: "Archive" }, meta);
    expect(back.id).toBe("local-1");
    expect(back.name).toBe("Synced");
  });
});
