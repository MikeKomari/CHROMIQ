# ADR-0008: Short share slugs in Postgres, with the legacy URL kept as a fallback

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** production-readiness session, 2026-10-23 (item 2); commits `0cecdcf`, `fe400bf`

## Decision

Chose **a random slug (`?s=<slug>`) pointing at a `shares` row** over
**base64-encoding the whole token system into `?share=`**, because large
systems outgrow browser and CDN URL limits, and a link stored on the server can
expire and be revoked.

Kept **the legacy `?share=` format working, and as the fallback when short
links are unavailable**, because links people had already sent must not break,
and sharing has to work on deployments without a database
([ADR-0001](0001-local-first-accounts-opt-in.md)).

## Context

Sharing a direction for review is the one thing that should not need an
account, so signed-out users can create short links too.

## Consequences

- Shares expire after a year (`SHARE_TTL_DAYS = 365`), are pruned on write, and
  can be revoked by their owner with `DELETE /api/shares/[slug]`. The ownership
  check sits inside the statement, so there is no check-then-act window.
- Payloads are capped at 256 KB. Slugs are validated before any query.
- A share payload is untrusted input on both paths. A hand-edited `mode` once
  crashed the workspace into its recovery screen (commit `fe400bf`), and both
  decoders now validate it.
- When the database hangs, the client still falls back to a `?share=` link, but
  only after the server request fails, which took 19 s on the 2026-11-05 game
  day.
