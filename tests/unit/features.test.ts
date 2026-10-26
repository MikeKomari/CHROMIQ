import { afterEach, describe, expect, it } from "vitest";

import { accountsEnabled, accountsFlag, databaseEnabled } from "@/lib/server/features";

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

  it("treats blank and unrecognised values as auto, rather than guessing", () => {
    for (const accounts of ["", "   ", "maybe", "yes"]) {
      env({ accounts });
      expect(accountsFlag()).toBe("auto");
    }
  });

  it.each(["off", "OFF", " Off ", "0", "false"])("reads %o as off", (accounts) => {
    env({ accounts });
    expect(accountsFlag()).toBe("off");
  });

  it.each(["on", "ON", " On ", "1", "true"])("reads %o as on", (accounts) => {
    env({ accounts });
    expect(accountsFlag()).toBe("on");
  });
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
    env({ accounts: "on" });
    expect(accountsEnabled()).toBe(true);
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
