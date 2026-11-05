# ADR-0006: Postgres-backed rate limiting, with an in-memory fallback

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23 (item 3); `lib/server/rate-limit-db.ts`

## Decision

Chose **a fixed-window counter in a Postgres `rate_limits` table, falling back
to the per-process limiter when the database is off or unreachable** over
**Upstash/Redis** or **only the in-memory limiter**, because the owner was
already provisioning Postgres ("we are going to have a postgres"), and a second
data store would be a new vendor and a new outage surface for one table.

## Context

`lib/rate-limit.ts` kept counts per process. On Vercel each instance has its own
memory, so under real traffic the limits were effectively per instance, not per
client. Windows are aligned to a shared clock boundary, so whichever instance
sees a request first cannot reset the window.

## Consequences

- Sign-in (20 per 15 minutes per IP, 10 per 15 minutes per account), sign-up
  and share creation are counted across instances.
- **`/api/proxy` and `/api/inspect` still use the in-memory limiter.** They are
  the endpoints that spend egress, and they are still limited only per instance.
- **The fallback costs a full connect timeout.** On the 2026-11-05 game day,
  with the database accepting TCP but never answering, each limiter call waited
  the pool's 10 s `connectionTimeoutMillis` before falling back. Sign-in makes
  two such calls, which is a large part of its 29 s failure. See the
  [postmortem](../postmortems/2026-11-05-gameday-database-unreachable.md).
- `pruneRateLimits` exists but **has no callers**, and there is no cron, so old
  windows are never deleted. See failure mode D11 and the runbook's
  housekeeping section.
