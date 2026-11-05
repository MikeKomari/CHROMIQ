# ADR-0010: An explicit `CHROMIQ_ACCOUNTS` switch

- **Status:** Accepted
- **Date:** 2026-10-26
- **Source:** commits `7bb7d02`, `2a46071`; `lib/server/features.ts`

## Decision

Chose **an explicit `CHROMIQ_ACCOUNTS=on|off` flag (unset means "follow
`DATABASE_URL`")** over **inferring everything from whether `DATABASE_URL` is
set**, because with the URL set and the host unreachable, every auth, share and
project route waited out the 10 s connection timeout. Removing the URL to avoid
that also broke `npm run migrate`, which reads it.

Chose **warning and falling back to "auto" on an unrecognised value** over
**refusing to boot**, because an optional flag's typo should not take the whole
site down. Silently treating `disabled` as "auto" turned accounts *on*, which
was a review finding, so the accepted spellings were widened and anything else
now logs a warning.

## Context

Unset keeps the original behaviour exactly, so existing deployments and the test
suite were unaffected.

## Consequences

- `off` is the **kill switch** for a database incident. Sign-in, sign-up,
  account deletion, project sync and share routes answer 503 without opening a
  connection. `GET /api/auth/me` answers 200 with `accountsEnabled: false`, so
  the client hides the account controls, and sign-out answers 200 after clearing
  the cookie. On the
  2026-11-05 game day every gated route answered in 31 ms or less with the
  database hung.
- Turning accounts off also stops the shared rate limiter dialling the database
  ([ADR-0006](0006-postgres-rate-limiting.md)).
- The switch is manual. Nothing flips it automatically when the database goes
  away, and in `auto` mode `/api/auth/me` keeps advertising
  `accountsEnabled: true` during an outage, because an anonymous request never
  touches the database.
