# ADR-0002: Email and password auth, with an OAuth-ready identity table

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23; `migrations/1729670000000_init.sql`

## Decision

Chose **email + password, stored in an `auth_identities` table keyed on
`(provider, provider_id)`** over **Google OAuth**, because:

1. **The repo is public.** With OAuth, anyone cloning it has to create a Google
   Cloud project, a consent screen and redirect URIs before auth works at all.
   Password auth needs only a `DATABASE_URL`.
2. **Sync is a minority feature** ([ADR-0001](0001-local-first-accounts-opt-in.md)).
   OAuth would add a third-party outage surface for the few who sign in.
3. **It is not less work.** Sessions, a users table, ownership checks and the
   sync layer are needed either way. OAuth removes only the password hash and
   reset flow, and adds a callback route, token exchange and provider config.

## Context

The owner asked for "1 simple user password auth, no google oauth" and then
asked whether OAuth would be better. The three reasons above were given, and the
owner kept password auth.

## Consequences

- Today `provider = 'password'` is the only row type. Adding Google later is a
  new provider value, not a schema rewrite.
- Passwords are hashed with scrypt from `node:crypto` (N=16384, r=8, p=1) in a
  self-describing `scrypt$N$r$p$salt$key` format, so parameters can be raised
  and old hashes rehashed on the next sign-in. No session recorded why scrypt
  was chosen over bcrypt or argon2.
- There is no email or password-reset path yet. A user who forgets their
  password has no self-service recovery.
