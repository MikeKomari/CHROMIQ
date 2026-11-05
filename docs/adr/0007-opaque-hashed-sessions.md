# ADR-0007: Opaque session tokens, stored only as SHA-256 hashes

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23; commit `0cecdcf`; `lib/server/sessions.ts`

## Decision

Chose **a random 32-byte token in an HttpOnly, SameSite=Lax cookie, with only its
SHA-256 hash stored in a `sessions` row** over **signed or JWT cookies**, because
server-side rows can be revoked. Signing out, "sign out other sessions" and
account deletion all need to end a session immediately, and a self-contained
token stays valid until it expires. A leaked `sessions` table also gives an
attacker nothing to replay.

The revocation reasoning comes from the code's shape (`destroySession`,
`destroyOtherSessions`, cascade on account delete). The session that built it
did not write down why JWTs were ruled out.

## Context

Every authenticated request already needs the database for the user's projects,
so one extra lookup per request costs little.

## Consequences

- Sessions last 30 days and slide forward once a request arrives past the
  halfway mark.
- `SESSION_SECRET` appears in `.env.example` but is **never read**: there is
  nothing to sign. Do not set it expecting it to do anything.
- A database outage signs everyone out in effect, because no session can be
  checked. `destroySession` now clears the cookie in a `finally`, so a failed
  delete cannot leave a browser signed in (commit `2a46071`).
- Expired rows used to pile up, because `pruneExpiredSessions` had no callers.
  Sign-in now prunes them opportunistically.
