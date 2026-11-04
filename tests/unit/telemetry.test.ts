import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The contract that matters for CHROMIQ-1005 is what telemetry refuses to do:
 * it must be off by default, it must not write without somewhere to write to,
 * it must truncate what a caller hands it, and it must never raise into the
 * code it is observing.
 */

const query = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => query(...args),
  databaseConfigured: () => Boolean(process.env.DATABASE_URL),
}));

const ORIGINAL = {
  flag: process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY,
  url: process.env.DATABASE_URL,
  release: process.env.NEXT_PUBLIC_CHROMIQ_RELEASE,
};

async function load() {
  vi.resetModules();
  return import("@/lib/server/telemetry");
}

function configure({ flag, url }: { flag?: string; url?: string }) {
  if (flag === undefined) delete process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY;
  else process.env.NEXT_PUBLIC_CHROMIQ_TELEMETRY = flag;
  if (url === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = url;
}

const DSN = "postgres://user:pw@localhost:5432/chromiq";

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  configure({ flag: ORIGINAL.flag, url: ORIGINAL.url });
  if (ORIGINAL.release === undefined) delete process.env.NEXT_PUBLIC_CHROMIQ_RELEASE;
  else process.env.NEXT_PUBLIC_CHROMIQ_RELEASE = ORIGINAL.release;
});

describe("telemetryEnabled", () => {
  it("is off when the flag is unset", async () => {
    configure({ url: DSN });
    const { telemetryEnabled } = await load();
    expect(telemetryEnabled()).toBe(false);
  });

  it.each(["off", "no", "0", "false", "maybe", ""])(
    "is off for the flag value %s",
    async (flag) => {
      configure({ flag, url: DSN });
      const { telemetryEnabled } = await load();
      expect(telemetryEnabled()).toBe(false);
    },
  );

  it.each(["on", "ON", " on ", "1", "true"])("is on for the flag value %s", async (flag) => {
    configure({ flag, url: DSN });
    const { telemetryEnabled } = await load();
    expect(telemetryEnabled()).toBe(true);
  });

  it("is off with the flag on but nowhere to write", async () => {
    configure({ flag: "on" });
    const { telemetryEnabled } = await load();
    expect(telemetryEnabled()).toBe(false);
  });
});

describe("record", () => {
  it("writes nothing when telemetry is off", async () => {
    configure({ url: DSN });
    const { record } = await load();
    expect(await record([{ kind: "error", name: "boom" }], "client")).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("writes nothing for an empty batch", async () => {
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    expect(await record([], "server")).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("writes an accepted batch as one statement", async () => {
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    const written = await record(
      [
        { kind: "vital", name: "LCP", value: 1234.5 },
        { kind: "failure", name: "proxy", reason: "timeout" },
      ],
      "client",
    );
    expect(written).toBe(2);
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO telemetry_events");
    expect(params).toHaveLength(14);
  });

  it("drops an unknown kind rather than storing it", async () => {
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    expect(
      await record([{ kind: "exfiltrate" as never, name: "x" }], "client"),
    ).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("drops an event with no name", async () => {
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    expect(await record([{ kind: "error", name: "" }], "client")).toBe(0);
  });

  it("takes the surface from the caller, not from the event", async () => {
    // A browser must not be able to claim its report came from the server.
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    await record(
      [{ kind: "error", name: "x", ...({ surface: "server" } as object) }],
      "client",
    );
    expect(query.mock.calls[0][1][1]).toBe("client");
  });

  it("truncates detail so a caller cannot store a whole page", async () => {
    configure({ flag: "on", url: DSN });
    const { record, MAX_DETAIL } = await load();
    await record([{ kind: "error", name: "x", detail: "y".repeat(5000) }], "client");
    expect((query.mock.calls[0][1][4] as string).length).toBe(MAX_DETAIL);
  });

  it("stores null rather than an empty string for a blank field", async () => {
    configure({ flag: "on", url: DSN });
    const { record } = await load();
    await record([{ kind: "error", name: "x", reason: "   ", detail: "" }], "client");
    expect(query.mock.calls[0][1][3]).toBeNull();
    expect(query.mock.calls[0][1][4]).toBeNull();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "stores null for the non-finite value %s",
    async (value) => {
      // Postgres rejects NaN in a double precision column, which would turn a
      // bad measurement into a failed write for the whole batch.
      configure({ flag: "on", url: DSN });
      const { record } = await load();
      await record([{ kind: "vital", name: "LCP", value }], "client");
      expect(query.mock.calls[0][1][5]).toBeNull();
    },
  );

  it("records the release when one is configured", async () => {
    configure({ flag: "on", url: DSN });
    process.env.NEXT_PUBLIC_CHROMIQ_RELEASE = "abc123";
    const { record } = await load();
    await record([{ kind: "feature", name: "export.css" }], "client");
    expect(query.mock.calls[0][1][6]).toBe("abc123");
  });

  it("returns 0 instead of throwing when the write fails", async () => {
    // An observability outage must not become an application outage.
    configure({ flag: "on", url: DSN });
    query.mockRejectedValue(new Error("relation does not exist"));
    const { record } = await load();
    await expect(record([{ kind: "error", name: "x" }], "server")).resolves.toBe(0);
  });
});

describe("recordFailure", () => {
  it("does not return a promise the caller has to handle", async () => {
    configure({ flag: "on", url: DSN });
    const { recordFailure } = await load();
    expect(recordFailure("proxy", "timeout")).toBeUndefined();
  });

  it("swallows a rejected write", async () => {
    configure({ flag: "on", url: DSN });
    query.mockRejectedValue(new Error("down"));
    const { recordFailure } = await load();
    expect(() => recordFailure("proxy", "timeout")).not.toThrow();
    // Let the floating promise settle; an unhandled rejection would fail here.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
