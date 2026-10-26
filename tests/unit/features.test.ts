import { afterEach, describe, expect, it, vi } from "vitest";

import { accountsEnabled, accountsFlag, databaseEnabled } from "@/lib/server/features";

// `warnOnce` keeps a module-level set of the messages it has already emitted,
// and these tests share one instance of the module. Each unrecognised value
// produces a distinct message, so those warn independently; the "on with no
// DATABASE_URL" message is a single string, so only the first test to trigger
// it can assert that it fired. That test is declared before the others that
// reach the same branch, and the assertions below rely on that order.
const ORIGINAL = {
  accounts: process.env.CHROMIQ_ACCOUNTS,
  databaseUrl: process.env.DATABASE_URL,
};

function env({ accounts, databaseUrl }: { accounts?: string; databaseUrl?: string }) {
  if (accounts === undefined) delete process.env.CHROMIQ_ACCOUNTS;
  else process.env.CHROMIQ_ACCOUNTS = accounts;
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;
}

const DSN = "postgres://user:pw@localhost:5432/chromiq";

afterEach(() => {
  env({ accounts: ORIGINAL.accounts, databaseUrl: ORIGINAL.databaseUrl });
});

describe("accountsFlag", () => {
  it("defaults to auto when unset", () => {
    env({});
    expect(accountsFlag()).toBe("auto");
  });

  it("treats a blank value as auto", () => {
    for (const accounts of ["", "   "]) {
      env({ accounts });
      expect(accountsFlag()).toBe("auto");
    }
  });

  it.each(["off", "OFF", " Off ", "0", "false", "no", "disable", "disabled"])(
    "reads %o as off",
    (accounts) => {
      env({ accounts });
      expect(accountsFlag()).toBe("off");
    },
  );

  it.each(["on", "ON", " On ", "1", "true", "yes", "enable", "enabled"])(
    "reads %o as on",
    (accounts) => {
      env({ accounts });
      expect(accountsFlag()).toBe("on");
    },
  );

  // The dangerous reading of an unknown value is the silent one: with
  // DATABASE_URL set, "auto" means enabled, so an operator who wrote
  // "disabled" or mistyped "of" would get the opposite of what they asked for.
  // Falling back is still the right behaviour — refusing to boot over a typo is
  // worse — but it has to be audible.
  it.each(["maybe", "of", "offf", "enabled!", "true-ish"])(
    "falls back to auto on %o, but warns",
    (accounts) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      env({ accounts });
      expect(accountsFlag()).toBe("auto");
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0][0]).toContain("CHROMIQ_ACCOUNTS");
      warn.mockRestore();
    },
  );
});

describe("accountsEnabled", () => {
  it("follows DATABASE_URL when the flag is unset", () => {
    env({ databaseUrl: DSN });
    expect(accountsEnabled()).toBe(true);
    env({});
    expect(accountsEnabled()).toBe(false);
  });

  it("stays off with the flag off even when a database is configured", () => {
    env({ accounts: "off", databaseUrl: DSN });
    expect(accountsEnabled()).toBe(false);
  });

  it("stays on with the flag on so a misconfigured deploy fails loudly", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    env({ accounts: "on" });
    expect(accountsEnabled()).toBe(true);
    // Not every route reaches the database, so the 500 alone is not a reliable
    // signal that the deployment is misconfigured.
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("DATABASE_URL");
    warn.mockRestore();
  });
});

describe("databaseEnabled", () => {
  it("requires both a configured database and accounts left on", () => {
    env({ databaseUrl: DSN });
    expect(databaseEnabled()).toBe(true);

    env({ accounts: "off", databaseUrl: DSN });
    expect(databaseEnabled()).toBe(false);

    // The flag alone cannot conjure a connection string, so the shared rate
    // limiter must still fall back to counting per process.
    env({ accounts: "on" });
    expect(databaseEnabled()).toBe(false);
  });
});
