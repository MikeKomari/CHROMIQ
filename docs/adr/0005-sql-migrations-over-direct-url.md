# ADR-0005: Plain-SQL up/down migrations, run over the direct connection

- **Status:** Accepted
- **Date:** 2026-10-23 (written), 2026-10-30 (first applied)
- **Source:** production-readiness session, 2026-10-23; database session, 2026-10-30; commits `2dd79f5`, `2c11019`, `dc8490b`, `10ce284`

## Decision

Chose **node-pg-migrate with plain `.sql` files that each carry an up and a down
section, run as `prism_owner` over `DIRECT_URL` (the tunnel)** over **an ORM's
migration system, or running migrations through the pooler**, because:

- The owner asked for migrations "so we can go up and down".
- Plain SQL matches a codebase with no ORM (`lib/db.ts` is a thin `pg` pool).
- PgBouncer runs in transaction pooling mode, which has no session-level
  advisory locks. node-pg-migrate takes one to stop two migrations from
  running at once.

## Context

The first migration was written on 2026-10-23 but could not run for a week: the
tunnel was down, and then four separate defects stood in the way (see
[the runbook](../runbook.md#migrations)).

## Consequences

- `npm run migrate` needs Node 20 or later, the tunnel open, and
  `--schema=prism` placed *before* the other flags. node-pg-migrate ignores the
  role's `search_path` and defaults to `public`, and its array-typed `--schema`
  flag swallows a trailing `up`.
- On 2026-10-30, running a migration through the pooler by mistake leaked an
  advisory lock onto an idle pooled connection. Later migrations reported
  "Another migration is already running" until that backend was terminated.
  That is the failure this ADR exists to prevent.
- Down migrations exist but have never been exercised against the live
  database.
