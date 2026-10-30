import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { connectionConfig } from "@/lib/db";

// A CA only has to be recognisable as PEM here; nothing parses it.
const PEM = "-----BEGIN CERTIFICATE-----\nZmFrZQ==\n-----END CERTIFICATE-----\n";

// An environment variable is trimmed before use, so PEM read from one loses
// the trailing newline that the same text keeps when read from a file. Both
// are accepted by Node's TLS; the asymmetry is only worth naming so the
// expectations below do not look arbitrary.
const FROM_ENV = PEM.trim();

const ORIGINAL = process.env.PGSSLROOTCERT;

function rootCert(value?: string) {
  if (value === undefined) delete process.env.PGSSLROOTCERT;
  else process.env.PGSSLROOTCERT = value;
}

function certFile(contents = PEM) {
  const path = join(mkdtempSync(join(tmpdir(), "chromiq-ca-")), "ca.crt");
  writeFileSync(path, contents);
  return path;
}

/** The ssl object node-postgres would end up using, for readable assertions. */
function sslOf(config: ReturnType<typeof connectionConfig>) {
  return (config as { ssl?: unknown }).ssl;
}

const DSN = "postgres://user:pw@db.example.com:6432/appdb";

afterEach(() => {
  rootCert(ORIGINAL);
});

describe("connectionConfig", () => {
  it("passes the string through untouched when no CA is configured", () => {
    rootCert(undefined);
    expect(connectionConfig(`${DSN}?sslmode=verify-full`)).toEqual({
      connectionString: `${DSN}?sslmode=verify-full`,
    });
  });

  it("treats a blank PGSSLROOTCERT as unset", () => {
    for (const value of ["", "   "]) {
      rootCert(value);
      expect(connectionConfig(DSN)).toEqual({ connectionString: DSN });
    }
  });

  it("uses PGSSLROOTCERT directly when it holds PEM text", () => {
    rootCert(PEM);
    expect(sslOf(connectionConfig(`${DSN}?sslmode=verify-full`))).toMatchObject({ ca: FROM_ENV });
  });

  it("tolerates PEM text with surrounding whitespace", () => {
    rootCert(`\n  ${PEM}  \n`);
    expect(sslOf(connectionConfig(DSN))).toMatchObject({ ca: FROM_ENV });
  });

  it("reads the file when PGSSLROOTCERT holds a path", () => {
    rootCert(certFile());
    expect(sslOf(connectionConfig(`${DSN}?sslmode=verify-full`))).toMatchObject({ ca: PEM });
  });

  // The whole reason this helper exists: node-postgres lets the connection
  // string's TLS settings replace an `ssl` passed next to it, so a URL with
  // sslmode= would otherwise drop the CA entirely.
  it("keeps the CA on a string that carries its own sslmode", () => {
    rootCert(PEM);
    const config = connectionConfig(`${DSN}?sslmode=verify-full`);
    expect(config).not.toHaveProperty("connectionString");
    expect(sslOf(config)).toMatchObject({ ca: FROM_ENV });
  });

  it("preserves what the connection string already said about TLS", () => {
    rootCert(PEM);
    const ssl = sslOf(connectionConfig(`${DSN}?sslmode=no-verify`));
    // The CA is added without discarding rejectUnauthorized.
    expect(ssl).toMatchObject({ ca: FROM_ENV, rejectUnauthorized: false });
  });

  it("still carries the connection details across", () => {
    rootCert(PEM);
    expect(connectionConfig(`${DSN}?sslmode=verify-full`)).toMatchObject({
      host: "db.example.com",
      // parseIntoClientConfig hands node-postgres a number, not the raw string.
      port: 6432,
      database: "appdb",
      user: "user",
    });
  });

  it("leaves TLS off when the string disables it", () => {
    rootCert(PEM);
    expect(sslOf(connectionConfig(`${DSN}?sslmode=disable`))).toBe(false);
  });

  it("applies the CA to a string that says nothing about TLS", () => {
    rootCert(PEM);
    expect(sslOf(connectionConfig(DSN))).toMatchObject({ ca: FROM_ENV });
  });

  it("explains itself when PGSSLROOTCERT is neither PEM nor a readable file", () => {
    rootCert("/does/not/exist/ca.crt");
    expect(() => connectionConfig(DSN)).toThrow(/neither PEM text nor a readable file/);
  });
});
