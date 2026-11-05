# ADR-0003: Self-hosted Postgres on a small VM

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** the private database runbook (outside this repo); production-readiness session, 2026-10-23

## Decision

Chose **one self-hosted Postgres 16 + PgBouncer VM, shared with a sibling
project and isolated by schema** over **Supabase's free tier**, because the free
tier pauses a project after 7 days of inactivity, which is fatal for a side
project whose traffic is bursty.

## Context

An earlier backlog note assumed Supabase. When the database was built, CHROMIQ
had no database code yet, and its only other server dependency was the restyle
proxy.

## Consequences

- One small VM (2 vCPU, 842 MB RAM, 2 GB swap) is a **single point of failure**
  for accounts, sync, share links and the shared rate limiter. There is no
  replica. Memory pressure is the most likely failure, and the runbook says not
  to raise `shared_buffers` past about 192 MB.
- Operations are on the owner: TLS, backups (nightly, 14 days' retention),
  fail2ban, OS patching. The first week ran with the wrong server certificate
  because a documented config file was never created. See
  [ADR-0014](0014-fix-server-tls-not-client.md).
- No per-project bill, and full control over roles and privileges, which made
  [ADR-0004](0004-two-lane-database-access.md) possible.
- No Vercel Marketplace database was evaluated. If this is revisited, that is
  the obvious alternative to price.
