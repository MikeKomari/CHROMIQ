# ADR-0001: Projects live in localStorage; accounts are opt-in

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23; commit `0cecdcf`

## Decision

Chose **localStorage as the default store, with accounts only for cross-device
sync** over **requiring sign-in**, because the owner did not want anyone to have
to log in to use the tool. In their words: "Keep the localstorage feature as
default, if user chose to use this app across devices, only then the auth is
useful."

## Context

Before 2026-10-23 everything lived in `localStorage`, and clearing site data lost
every project. Adding a database raised the question of whether accounts should
become the main path.

## Consequences

- Visitors never meet a sign-in wall. The account dialog's copy says so: "You do
  not need an account to use CHROMIQ."
- Every database-backed route has to degrade to "accounts unavailable", and the
  client (`lib/sync.ts`, `hooks/use-account.ts`) has to keep working when a
  route fails. See [ADR-0010](0010-explicit-accounts-flag.md).
- Two sources of truth for signed-in users, which is why
  [ADR-0009](0009-optimistic-concurrency-sync.md) exists.
- Production can run with no database at all. On 2026-10-30 that was the live
  state: the Vercel project had no environment variables set.
