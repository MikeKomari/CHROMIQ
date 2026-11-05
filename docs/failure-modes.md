# CHROMIQ failure modes

What breaks, how you would notice, what users feel, and what already limits the
damage. "Evidence" points to where the behaviour was actually seen, not guessed:
a build session, a commit, or the
[2026-11-05 game day](postmortems/2026-11-05-gameday-database-unreachable.md).
Rows without evidence are reasoned from the code and say so.

As of 2026-11-05. Severity reflects a deployment *with accounts on*. With
accounts off, every database row in the table drops to "none".

## Database and accounts

| # | Failure | How it shows up | User impact | Mitigation in place | Gap / next action | Evidence |
|---|---|---|---|---|---|---|
| D1 | **Database host refuses connections** (Postgres or PgBouncer stopped, VM down, port closed) | `ECONNREFUSED` in the function logs. Every database route returns **500 with an empty body** in about 15 ms | Sign-in, sync and short-link reads fail. Anonymous `/api/auth/me` still says `accountsEnabled: true`, so the account button stays visible. Local work is unaffected | Kill switch `CHROMIQ_ACCOUNTS=off` ([ADR-0010](adr/0010-explicit-accounts-flag.md)); client fallbacks in `lib/sync.ts` | No health check or alert. Nothing flips the switch automatically. A 500 with no body gives the client nothing useful to show | Game day, 2026-11-05 |
| D2 | **Database accepts TCP but never answers** (stale SSH tunnel, hung PgBouncer, a network blackhole) | Requests hang until the pool's 10 s connect timeout, then "Connection terminated due to connection timeout" | Session lookups, project lists and share reads wait **~9.7 s** before a 500. Share creation waits **~19 s**. Sign-in waits **~29 s**. Function time is billed throughout | Same kill switch. Client fallbacks eventually kick in | Lower `connectionTimeoutMillis` for request paths. Make the limiter stop retrying the database after one failure (circuit breaker). Add a client-side `AbortSignal` timeout | Game day, 2026-11-05. The same half-open tunnel was seen on 2026-10-23 |
| D3 | **VM memory pressure**: the OOM killer takes Postgres (842 MB RAM, 2 GB swap) | `dmesg` shows OOM kills; then D1 | As D1 | Swapfile; tuned `shared_buffers` | No alerting on the VM. No replica | Runbook warning; not observed |
| D4 | **PgBouncer pool saturation** | `SHOW POOLS` shows `cl_waiting > 0`; requests slow down, not fail | Slow sign-in and sync | Each function instance caps its pool at 10 (`DATABASE_POOL_MAX`) | Many warm Vercel instances × 10 can outnumber the server-side pool. Not load-tested | Reasoned from config |
| D5 | **Production CA missing or given as a path** (`PGSSLROOTCERT` unset, or set to a laptop path) | "unable to verify the first certificate", or an error that names `PGSSLROOTCERT`. Both appear on the **first database query**, not at deploy or start-up | Every database route fails. Anonymous `/api/auth/me` still looks fine | `lib/db.ts` accepts PEM text and names the variable on a bad value ([ADR-0013](adr/0013-ca-merged-into-parsed-config.md)) | Set the PEM as text in Vercel when accounts go live, then probe a database route, not `/api/auth/me` | Negative control, 2026-10-30 |
| D6 | **Postgres serves the wrong certificate** (package snakeoil instead of the CA-signed one) | `verify-full` fails on the direct lane only; the pooler still works | None at runtime; migrations blocked | Fixed by adding `conf.d/20-ssl.conf` ([ADR-0014](adr/0014-fix-server-tls-not-client.md)) | Re-check the served certificate after any Postgres package upgrade | 2026-10-23 → 2026-10-30, found and fixed |
| D7 | **Migration run through the pooler** | Lock leaked onto an idle pooled backend; later runs say "Another migration is already running" | None at runtime; migrations blocked | `npm run migrate` reads `DIRECT_URL` only ([ADR-0005](adr/0005-sql-migrations-over-direct-url.md)) | The runbook has the unlock query | 2026-10-30, caused by an agent |
| D8 | **Migration tooling misfires** (Node 18, `dotenv` missing, `--schema` misplaced, tunnel closed) | yargs "minimum Node.js version of 20", a misleading "DIRECT_URL is not set", usage text printed with exit 1, or `ECONNREFUSED` | None at runtime | Script fixed (`2dd79f5`, `dc8490b`); preconditions listed in the runbook | No `.nvmrc`, so the Node version is still on the operator | 2026-10-30 |
| D9 | **Tables created in the wrong schema** | Migration reports success, then every query fails on a missing table | All database routes fail | Script pins `--schema=prism` (`2c11019`) | — | Caught before it happened, 2026-10-30 |
| D10 | **Session store unreachable at sign-out** | 500 on `/api/auth/logout` | Before the fix the browser stayed signed in; now the cookie is cleared anyway | `destroySession` clears the cookie in `finally` (`2a46071`) | — | Review finding, 2026-10-26 |
| D11 | **Housekeeping tables grow without bound** | Table size, e.g. `pg_total_relation_size('prism.rate_limits')` | None at first; disk eventually | Sessions are pruned at sign-in; shares on share-create | **`pruneRateLimits` has no callers**, so `rate_limits` is never pruned. Call it from a request path or a Vercel cron | `grep`, 2026-11-05 |
| D12 | **`CHROMIQ_ACCOUNTS` misspelled** | Server log: "CHROMIQ_ACCOUNTS is set to …, which is not a value this build understands" | Before the fix, accounts silently came up *on*. Now it warns and follows `DATABASE_URL` | Accepted spellings widened; warning (`2a46071`) | — | Review finding, 2026-10-26 |
| D13 | **`CHROMIQ_ACCOUNTS=on` with no `DATABASE_URL`** | Warning in the log; 500s on database routes | Account UI shown, every action fails | Warning | — | `lib/server/features.ts` |
| D14 | **Nightly backup fails silently** | Only `journalctl -u pg-backup.service` shows it | None until a restore is needed | 14-day retention | No alert on failure. No session has recorded a restore drill | Not verified |

## Restyle, import and sharing

| # | Failure | How it shows up | User impact | Mitigation in place | Gap / next action | Evidence |
|---|---|---|---|---|---|---|
| R1 | **Visitor points the proxy at an internal address** (SSRF, DNS rebinding, a redirect into a private range) | Request refused | None (blocked) | IP checked per hop at connect time on the *resolved* address; manual redirect re-validation; one deadline; decompressed size cap ([ADR-0011](adr/0011-restyle-proxy-script-free-sandbox.md)) | — | 135 unit cases in `url-safety`; 2026-10-24 audit |
| R2 | **Hostile page tries to run script** | Nothing runs | None | Sanitiser, plus an iframe sandbox without `allow-scripts` | Adding `allow-scripts` would break both layers at once. Never do it | 24/24 XSS payloads inert, 2026-10-24 |
| R3 | **Page renders only with JavaScript** | Blank or partial preview, labelled "scripts disabled" | Feature looks broken on SPA sites | Honest label; bookmarklet as the alternative | Headless rendering (`CHROMIQ-702`) | Known limitation since 2026-10-18 |
| R4 | **Bookmarklet blocked by the site's CSP** | Nothing happens on the site | Feature silently unavailable there | Landing copy says "most public pages" | No in-page signal is possible once CSP blocks the script | GitHub, 2026-10-18 |
| R5 | **Hostile CSS stalls the import parser** (ReDoS) | Before the fix, one request held the event loop for 40 s or more | Before the fix, every request on that instance froze | Linear scanners, 1.5 s budget, rule and variable caps ([ADR-0012](adr/0012-linear-css-extraction.md)) | — | Reproduced and fixed, 2026-10-20 |
| R6 | **Proxy or import abuse** (egress cost) | High request volume | Cost, not correctness | 20/min per IP on the proxy, 30/min on import; 8 and 4 in flight | Limits are **per instance** ([ADR-0006](adr/0006-postgres-rate-limiting.md)). Off Vercel, a missing `x-forwarded-for` puts every client in one `"unknown"` bucket | 2026-10-24 audit |
| R7 | **Crafted share link** | Before the fix, the workspace dropped into its recovery screen | One broken page load | `mode` validated on both share paths (`fe400bf`) | Treat every share field as untrusted | 2026-10-26 |
| R8 | **Restyle import fires twice** (React StrictMode in dev) | Two proxy requests per import; one returned 502 | Rate limit spent at double speed | Effect keyed by request id (`e0c156e`) | — | 2026-10-26 |
| R9 | **Short-link creation slow because the database hangs** | ~19 s spinner, then a long `?share=` link | Works, eventually. The clipboard write may then fail because the click's user activation has expired (suspected, not tested) | Fallback to `?share=` | Same fix as D2 | Game day, 2026-11-05 |

## Client

| # | Failure | How it shows up | User impact | Mitigation in place | Gap / next action | Evidence |
|---|---|---|---|---|---|---|
| C1 | **localStorage cleared, full, or blocked** (private window, browser quota) | Projects gone on reload; a blocked or full store throws inside a `useEffect` in `hooks/use-workspace.ts` | **Data loss** for anyone not signed in | Only the `JSON.parse` of stored values is guarded. Export and optional sync are the backstops | The `getItem`/`setItem` calls for `chromiq-tokens`, `-projects`, `-settings` and `-locks` are **not** wrapped (`safe-storage.ts` covers layout state only). Wrap them, and tell the user when a save fails | Code read, 2026-11-05 |
| C2 | **Landing content depends on animation** | Before the fix, chapters were blank with JS off | Empty page for no-JS readers and crawlers | Content visible by default, hidden only after hydration ([ADR-0016](adr/0016-landing-light-exception.md)) | — | Found by screenshot, 2026-10-23 |
| C3 | **Account probe fails** | `/api/auth/me` errors | Account controls hidden ("unavailable"); local work continues | `hooks/use-account.ts` treats failure as unavailable | For a browser holding a session cookie, takes ~10 s when the database hangs (D2). Without a cookie the probe never queries the database, so it answers instantly and reports accounts as available | Game day, 2026-11-05 |

## Build and deploy

| # | Failure | How it shows up | User impact | Mitigation in place | Gap / next action | Evidence |
|---|---|---|---|---|---|---|
| B1 | **Broken commit pushed to `main`** | Vercel builds and promotes it; CI runs in parallel | A broken production deploy, if the build itself passes | CI (lint, typecheck, 472 tests, build) runs on pushes to `main` and on pull requests. A feature-branch push with no PR gets no CI run | CI does not gate the Vercel deploy. Rollback is manual (see the runbook) | Deploy path confirmed 2026-10-30 |
| B2 | **SWC native binary truncated** by an interrupted install | `next` dies with SIGBUS / "Bus error (core dumped)" | Local only | `npm ci` reinstalls it (`AGENTS.md`) | — | Seen locally |
| B3 | **Stale `next start` still holding the port** | `EADDRINUSE`; new HTML served against old assets (CSS 400) | Local only | Kill by port, not by name | `pkill -f "next start"` matches and kills the invoking shell | 2026-10-23 |
| B4 | **Tests run on Node 18** | `styleText` export error from `node:util` | Local only | Use Node 22 via nvm | Add `.nvmrc` | `TESTING.md` |
