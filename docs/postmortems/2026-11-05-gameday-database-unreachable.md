# Postmortem: database made unreachable on purpose (game day)

- **Date:** 2026-11-05, about 10:45–10:56 WIB
- **Type:** Deliberate failure injection ("kill the database node"), not a
  customer incident
- **Environment:** local production build (`next build` + `next start`) of
  commit `6891825`, on the maintainer's machine
- **Blast radius:** none outside the test. The shared database VM was **not**
  touched; the outage was simulated by pointing the app at addresses that fail
  in controlled ways
- **Status:** closed; action items open
- **Format:** blameless. "We" is the project.

## Summary

We made CHROMIQ's only server dependency, the Postgres VM behind PgBouncer,
unreachable in two ways: refusing connections, and accepting connections
without ever answering. Then we measured every route.

The design held where it was meant to. No local work was at risk, restyle and
export kept working, and the `CHROMIQ_ACCOUNTS=off` kill switch made every
database route answer in 31 ms or less: a clean 503, or `accountsEnabled:false`
from `/api/auth/me`.

The *hung* database exposed something the code review had not: requests do not
fail fast, they stack timeouts. **Sign-in took 29 s to fail and share creation
19 s**, each ending in a 500 with an empty body. In the default `auto` mode,
`/api/auth/me` kept telling clients that accounts were available the whole time.

## Why we ran it

Every database feature was built with a degrade path
([ADR-0001](../adr/0001-local-first-accounts-opt-in.md),
[ADR-0006](../adr/0006-postgres-rate-limiting.md),
[ADR-0010](../adr/0010-explicit-accounts-flag.md)), but only the "no
`DATABASE_URL` at all" case had been exercised end to end. Two real near-misses
pointed at the untested cases:

- On 2026-10-23 the admin SSH tunnel went **half-open**: TCP accepted, Postgres
  handshake never completed. That is exactly the shape a hung PgBouncer or a
  network blackhole would present to production.
- The commit that added the kill switch (`7bb7d02`) said "every auth, share and
  project route waited out the ten second connection timeout" in development,
  but nobody had measured what a user would actually wait for on each route.

**Hypothesis, written down from the code before running:** with a hung
database, any route that calls the database once fails after about 10 s.
Sign-in calls the shared rate limiter twice before its own query, and the
limiter falls back to memory only *after* its own timeout, so sign-in should
take about 30 s. Share creation (one limiter call, then the insert) should take
about 20 s. The kill switch should remove all of it.

## Method

One production build, started four times on port 3100 with different
environments. Each run made the same requests with `curl` and recorded status,
time and body:

| Run | `DATABASE_URL` points at | Simulates |
|---|---|---|
| Baseline | the real pooled database (read-only requests only) | normal operation |
| Fault 1: refused | `127.0.0.1:1`, a closed port | VM down, Postgres or PgBouncer stopped |
| Fault 2: hung | `127.0.0.1:16432`, a listener that accepts TCP and never sends a byte | half-open tunnel, hung pooler, network blackhole |
| Mitigation | the hung listener again, plus `CHROMIQ_ACCOUNTS=off` | the runbook's first response |

Requests: `GET /workspace`, `GET /api/auth/me` with and without a session
cookie, `GET /api/shares/<slug>`, `GET /api/projects` with a cookie,
`POST /api/auth/login`, `POST /api/shares`, and `GET /api/proxy?url=https://example.com`.
The two writes ran only in the fault runs, so no rows were written to the real
database.

## Results

| Request | Baseline | Refused | **Hung** | Hung + `CHROMIQ_ACCOUNTS=off` |
|---|---|---|---|---|
| `GET /workspace` | 200 · 0.02 s | 200 · 0.01 s | 200 · 0.01 s | 200 · 0.01 s |
| `GET /api/auth/me` (anonymous) | 200 · `accountsEnabled:true` | 200 · **`accountsEnabled:true`** | 200 · **`accountsEnabled:true`** | 200 · `accountsEnabled:false` |
| `GET /api/auth/me` (cookie) | 200 · 0.37 s | 500 · 0.03 s | **500 · 9.7 s** | 200 · 0.01 s |
| `GET /api/shares/<slug>` | 404 · 0.04 s | 500 · 0.02 s | **500 · 9.7 s** | 503 · 0.01 s |
| `GET /api/projects` (cookie) | 401 · 0.04 s | 500 · 0.01 s | **500 · 9.6 s** | 503 · 0.01 s |
| `POST /api/auth/login` | (not run) | 500 · 0.02 s | **500 · 29.0 s** | 503 · 0.01 s |
| `POST /api/shares` | (not run) | 500 · 0.01 s | **500 · 19.2 s** | 503 · 0.01 s |
| `GET /api/proxy` | 200 · 0.21 s | 200 · 0.14 s | 200 · 0.16 s | 200 · 0.15 s |

Every 500 had an **empty body**: the error was thrown out of the route handler,
not turned into a JSON error. Server logs showed `ECONNREFUSED` (fault 1) and
"Connection terminated due to connection timeout" (fault 2).

The hypothesis held to within a second on every route.

## What a user would have seen

Reading the client code against these numbers (`hooks/use-account.ts`,
`hooks/use-workspace.ts`, `lib/sync.ts`):

- **Anonymous visitor:** the account button still shows, because `/api/auth/me`
  says accounts are on. Signing in spins for about 30 s, then fails with a
  generic "Request failed (500)."
- **Signed-in visitor** (a browser holding a session cookie): the account probe
  takes about 10 s, then marks accounts
  "unavailable" and carries on from localStorage. No local work is lost.
- **Anyone sharing:** the share button spins for about 19 s, then falls back to
  the long `?share=` link. That link works. We *suspect*, but did not test, that
  the clipboard write then fails, because browsers allow `clipboard.writeText`
  only shortly after the click.
- **Anyone opening a short link:** about 10 s, then an error. Short links have
  no fallback for the recipient.
- **Restyle, URL import, export, and the editor itself:** unaffected.

On Vercel, each of those waits is also billed function time. A burst of
sign-in attempts during an outage would hold instances for 30 s apiece.

## Why it behaved this way

1. **The pool waits 10 s for every new connection** (`connectionTimeoutMillis:
   10_000` in `lib/db.ts`), and a hung server is indistinguishable from a slow
   one until that timer fires. A refused connection fails in milliseconds; a
   silent one costs the full timeout.
2. **The shared rate limiter degrades only after it has failed.**
   `rate-limit-db.ts` catches the error and falls back to memory, which is the
   right outcome but comes after paying the timeout. It also has no memory of
   having failed, so the next call in the same request pays it again. Sign-in
   makes two limiter calls (per IP, then per account) before its own lookup:
   10 + 10 + 10 s.
3. **`auto` mode decides "accounts on" from configuration, not from health.**
   `accountsEnabled()` checks whether `DATABASE_URL` is set. Anonymous
   `/api/auth/me` never queries the database, so it cannot notice an outage.
4. **Route handlers let database errors escape**, so Next returns a bare 500.
   `lib/server/http.ts` already has `jsonError`; it is just not used on the
   failure path.
5. **The client has no request timeout.** `lib/sync.ts` calls `fetch` without
   an `AbortSignal`, so the browser waits as long as the server does.

## What went well

- The kill switch did exactly what [ADR-0010](../adr/0010-explicit-accounts-flag.md)
  promised: no connection attempt, 503 with a clear message, the client told to
  hide accounts, and nothing else affected.
- The local-first design meant the worst case was *slow and annoying*, never
  *data lost*.
- The restyle proxy and URL import have no database dependency, and the numbers
  confirm it.
- Every client fallback that exists (share link → `?share=`, failed probe →
  "unavailable") did engage, just late.

## What went wrong, or surprised us

- The size of the hung-database penalty on sign-in (29 s), and that it comes
  from the *protective* rate limiter, not from sign-in itself.
- `accountsEnabled: true` during a total outage. The health endpoint people will
  naturally reach for is the one that cannot see the problem. The runbook now
  says to probe `/api/shares/<slug>` instead.
- Empty 500 bodies. The client can only say "Request failed (500)."

## Action items

| # | Action | Fixes | Priority | Owner |
|---|---|---|---|---|
| 1 | Give request-path database calls a short connect timeout (2–3 s) and a client-side `query_timeout`, keeping the long timeout for migrations only. Use node-postgres's own timeout rather than `statement_timeout` as a startup parameter, which PgBouncer may reject | Hung waits on every route | P1 | maintainer |
| 2 | Add a small circuit breaker in `lib/db.ts`: after a connection failure, fail fast for ~30 s instead of dialling again. Have `rate-limit-db.ts` consult it, so one request never pays the timeout twice | 29 s sign-in, 19 s share | P1 | maintainer |
| 3 | Catch database errors in the account, sync and share routes and answer `503 {"error": "Accounts are temporarily unavailable."}` | Empty 500s, useless client message | P1 | maintainer |
| 4 | Add an `AbortSignal.timeout(…)` to `lib/sync.ts` requests, and have a failed or timed-out `createShare` fall back to `?share=` within a few seconds | Spinner time; suspected clipboard failure | P2 | maintainer |
| 5 | Add a cheap health route (`SELECT 1` with a 1 s timeout), and point an uptime monitor at it once accounts are live in production | Outage invisible from `/api/auth/me` | P2 | maintainer |
| 6 | Test the suspected clipboard failure after a slow share in a real browser | Unverified claim above | P3 | maintainer |
| 7 | Repeat this game day against the **Vercel** deployment once accounts are enabled there, and add a pool-exhaustion run (failure mode D4) | Local-only evidence | P3 | maintainer |

Items 1–3 together should bring the hung-database case down to the
refused-connection case: fast, explicit failures.

## Reproducing it

From the repo root, on Node 22, after `npm run build`:

```bash
# Fault 2: a "database" that accepts TCP and never answers
python3 -c '
import socket,time
s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
s.bind(("127.0.0.1",16432)); s.listen(64); held=[]
while True: held.append(s.accept()[0])' &

DATABASE_URL='postgresql://prism_app:x@127.0.0.1:16432/appdb' PGSSLROOTCERT= \
  npx next start -p 3100 &

curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"gameday@example.invalid","password":"not-a-real-password-123"}' \
  http://127.0.0.1:3100/api/auth/login
```

Swap the URL's port for `1` to get fault 1, or add `CHROMIQ_ACCOUNTS=off` to see
the mitigation. Afterwards, stop both processes by port
(`ss -ltnpH 'sport = :3100'`), not with `pkill -f`.
