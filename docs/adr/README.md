# Architecture decision records

Short records of the choices that shaped CHROMIQ. Each one opens with the
decision in one line, **chose X over Y because Z**, then gives just enough
context to judge it again later.

These were reconstructed on 2026-11-05 from the build sessions and commit
history between 2026-10-18 and 2026-10-30. Each record names its source. Where
a session made a choice without saying why, the record says so instead of
supplying a reason after the fact.

| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-local-first-accounts-opt-in.md) | Projects live in localStorage; accounts are opt-in, for cross-device sync only | Accepted | 2026-10-23 |
| [0002](0002-password-auth-over-oauth.md) | Email + password, with an OAuth-ready identity table, over Google OAuth | Accepted | 2026-10-23 |
| [0003](0003-self-hosted-postgres.md) | Self-hosted Postgres on a small VM over Supabase's free tier | Accepted | 2026-10-23 |
| [0004](0004-two-lane-database-access.md) | Apps through PgBouncer, admins through a tunnel; admin roles absent from the pooler | Accepted | 2026-10-23 |
| [0005](0005-sql-migrations-over-direct-url.md) | Plain-SQL up/down migrations over the direct connection, never the pooler | Accepted | 2026-10-23 |
| [0006](0006-postgres-rate-limiting.md) | Postgres-backed rate limiting with an in-memory fallback, over Redis | Accepted | 2026-10-23 |
| [0007](0007-opaque-hashed-sessions.md) | Opaque session tokens stored as SHA-256 hashes, over signed or JWT cookies | Accepted | 2026-10-23 |
| [0008](0008-short-share-links.md) | Short share slugs in Postgres, with the old `?share=` URL kept as a fallback | Accepted | 2026-10-23 |
| [0009](0009-optimistic-concurrency-sync.md) | Optimistic concurrency (revision + 409) over last-write-wins | Accepted | 2026-10-23 |
| [0010](0010-explicit-accounts-flag.md) | An explicit `CHROMIQ_ACCOUNTS` switch over inferring from `DATABASE_URL` | Accepted | 2026-10-26 |
| [0011](0011-restyle-proxy-script-free-sandbox.md) | Restyle through an SSRF-guarded proxy into a script-free sandbox, over running the site's JS | Accepted | 2026-10-18 |
| [0012](0012-linear-css-extraction.md) | Linear scanners with time and size budgets for URL import, over regexes | Accepted | 2026-10-20 |
| [0013](0013-ca-merged-into-parsed-config.md) | Merge the private CA into the parsed connection config, over `{ connectionString, ssl }` | Accepted | 2026-10-30 |
| [0014](0014-fix-server-tls-not-client.md) | Fix Postgres's certificate on the server, over relaxing client verification | Accepted | 2026-10-30 |
| [0015](0015-scroll-primitives-in-repo.md) | Build the scroll primitives inside CHROMIQ, over extracting a template repo first | Accepted | 2026-10-23 |
| [0016](0016-landing-light-exception.md) | Allow atmospheric light on the landing page only, over one rule for every surface | Accepted | 2026-10-23 |
| [0017](0017-lenis-on-window-scroll.md) | Lenis driving the real window scroll, over a transformed scroll container | Accepted | 2026-10-24 |
| [0018](0018-namespaced-tailwind-export.md) | Namespaced `--text-chromiq-*` in the Tailwind export, over Tailwind's own names | Accepted | 2026-10-21 |
| [0019](0019-rename-to-chromiq.md) | Rename PRISM to CHROMIQ, over keeping a common word | Accepted | 2026-10-23 |
| [0020](0020-low-glare-palette.md) | A low-glare palette with a High contrast switch, over maximum contrast by default | Accepted, palette later replaced | 2026-10-18 |
| [0021](0021-remove-the-mit-licence.md) | No licence, all rights reserved, over keeping MIT | Accepted | 2026-11-05 |

## Writing a new one

Copy [template.md](template.md), take the next number, and keep it short. If a
decision reverses an earlier one, set the old record's status to
`Superseded by ADR-00NN` instead of editing its reasoning.
