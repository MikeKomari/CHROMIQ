# ADR-0014: Fix the server's certificate, not the client's verification

- **Status:** Accepted
- **Date:** 2026-10-30
- **Source:** database session, 2026-10-30

## Decision

Chose **creating the missing `conf.d/20-ssl.conf` so Postgres serves the
CA-signed certificate, then tightening `DIRECT_URL` to `sslmode=verify-full`**
over **making the client accept the server as it was (`uselibpqcompat=true`, or
`sslmode=require` read as "encrypt, don't verify")**, because the CA-signed
certificate already listed `127.0.0.1` and `localhost` in its SANs. It was built
to make the tunnel path fully verifiable. Weakening the client would have
encoded a server misconfiguration as policy.

## Context

Migrations failed over the tunnel with a certificate error. PgBouncer served the
CA-signed certificate; Postgres served Debian's self-signed `ssl-cert-snakeoil`.
The timestamps told the story: the snakeoil certificate was created 86 seconds
before the CA. The runbook listed `20-ssl.conf` as existing, but it had never
been created, so Postgres ran for a week on the package defaults.

## Consequences

- Postgres was reloaded with SIGHUP, so no connections dropped. Both lanes now
  verify against the same private CA.
- The first instinct, three client-side options, was the wrong framing. When
  verification fails, check what the server is actually serving before relaxing
  anything.
- The runbook's claims need checking against the machine. This one was false
  for a week.
