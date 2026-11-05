# ADR-0009: Optimistic concurrency for project sync

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23; `app/api/projects/[id]/route.ts`

## Decision

Chose **a `revision` column, with every update sending the revision it started
from and the server answering 409 on a mismatch** over **last-write-wins**,
because a signed-in user can have the same project open in two browsers, and the
rule set for sync was "409 on conflict, never a silent overwrite".

## Context

Accounts exist so that one person can work across devices
([ADR-0001](0001-local-first-accounts-opt-in.md)), which is exactly the case
where two copies drift.

## Consequences

- The update is a single `UPDATE … WHERE id = $3 AND user_id = $4 AND deleted_at
  IS NULL AND revision = $5`. Ownership is part of the same predicate, so another user's project
  answers 404, not 403, and its existence does not leak.
- The client has to handle a 409 by showing the conflict. It cannot retry
  blindly.
- A `project_versions` table exists for history. No session recorded how often
  versions are written or pruned.
