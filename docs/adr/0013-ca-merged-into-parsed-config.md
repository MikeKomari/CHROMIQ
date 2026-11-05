# ADR-0013: Merge the private CA into the parsed connection config

- **Status:** Accepted
- **Date:** 2026-10-30
- **Source:** database session, 2026-10-30; commit `6891825`; `lib/db.ts`

## Decision

Chose **parsing `DATABASE_URL` with `pg-connection-string`'s
`parseIntoClientConfig` and merging the CA into the result** over **the obvious
`new Pool({ connectionString, ssl: { ca } })`**, because node-postgres does
`Object.assign({}, config, parse(connectionString))`. Whatever the URL says
about TLS replaces an `ssl` option passed beside it, so a URL carrying
`sslmode=verify-full` silently discards the CA.

Chose **one `PGSSLROOTCERT` variable that accepts either PEM text or a file
path, told apart by the PEM header** over **two variables**, because a laptop
has a file and Vercel can carry only a value.

## Context

The database's certificate is signed by a private CA. node-postgres never reads
`PGSSLROOTCERT` itself. Locally this was hidden, because the local URL carried
`sslrootcert=<path>`, which the driver does read.

## Consequences

- Without this fix, setting `DATABASE_URL` on Vercel would **not** have
  connected quietly without verification. It would have failed with "unable to
  verify the first certificate". A negative control (the same URL with no CA)
  proved the private CA is what does the verifying, not a public trust store.
- `sslmode=disable` is respected. A URL that says nothing about TLS but has a CA
  configured gets the CA, on the grounds that a loud failure beats verifying
  nothing in silence.
- An unreadable, non-PEM value throws an error that names the variable, not an
  opaque TLS error. The pool is created lazily, so that error appears on the
  first database query, not when the deployment starts.
