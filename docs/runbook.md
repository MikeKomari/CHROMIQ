# CHROMIQ runbook

Steps for the situations that have actually come up, or that the
[failure-modes table](failure-modes.md) says will. Each section is one
situation, from symptom to verified fix.

This file is public. The database host, SSH key, allowlisted IP and every
credential live in the **private database runbook** on the maintainer's laptop
(`~/db-project-RUNBOOK.md`), which also covers the VM itself: logs, fail2ban,
memory, backups and restore. Below, `<db-host>` stands for the VM's address.

## Contents

1. [Quick facts](#quick-facts)
2. [Is it healthy?](#is-it-healthy)
3. [Database down or hanging: switch accounts off](#database-down-or-hanging)
4. [A bad deploy reached production](#a-bad-deploy-reached-production)
5. [Turning accounts on in production](#turning-accounts-on-in-production)
6. [Migrations](#migrations)
7. ["Another migration is already running"](#another-migration-is-already-running)
8. [TLS verification fails](#tls-verification-fails)
9. [Housekeeping tables](#housekeeping-tables)
10. [Local build and dev problems](#local-build-and-dev-problems)

## Quick facts

| | |
|---|---|
| Production URL | `https://prism-gamma-three.vercel.app` (Vercel project `prism`) |
| How production deploys | Vercel Git integration, on every push to `main`. The `v*`-tag workflow has never run. |
| CI | GitHub Actions `ci.yml`: lint → typecheck → test → build, on pushes to `main` and on pull requests. It does **not** block the Vercel deploy. |
| Database lanes | App: `DATABASE_URL` → PgBouncer `:6432` as `prism_app`. Migrations: `DIRECT_URL` → tunnel `127.0.0.1:15432` as `prism_owner`. Never swap them. |
| Kill switch | `CHROMIQ_ACCOUNTS=off` ([ADR-0010](adr/0010-explicit-accounts-flag.md)) |
| Node | 22 locally (`export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"`); the system Node 18 breaks tests and migrations |

## Is it healthy?

```bash
curl -s https://prism-gamma-three.vercel.app/api/auth/me
```

- `{"user":null,"accountsEnabled":false}`: accounts are off, which is expected
  until production gets its env vars.
- `{"user":null,"accountsEnabled":true}`: accounts are on. **This alone does not
  prove the database is up.** An anonymous request answers before touching it
  (failure mode D1). To check the database path, ask for something that needs a
  query:

```bash
# 404 "never existed" = database answered. 500 = database problem. 503 = accounts off.
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
  https://prism-gamma-three.vercel.app/api/shares/abcdefghjk
```

A response time near 10 s on that request means the database is accepting
connections but not answering (D2). Treat it as down.

## Database down or hanging

**Symptoms:** sign-in spins for up to ~30 s and then fails; share links take ~20
s and come back long; function logs show `ECONNREFUSED` or "Connection
terminated due to connection timeout".

**1. Stop the bleeding: switch accounts off.** Sign-in, sign-up, sync and
short-link routes then answer 503 in milliseconds. `/api/auth/me` answers
`accountsEnabled:false`, so the client hides the account controls. Local work, restyle, import and export are unaffected. Signed-in users
keep their local copies.

- Vercel → project `prism` → Settings → Environment Variables → add
  `CHROMIQ_ACCOUNTS` = `off` for **Production**.
- Environment variables apply only to new deployments: Deployments → the
  current production deployment → **Redeploy**.
- Verify, expecting `accountsEnabled:false` and a fast 503:

```bash
curl -s https://prism-gamma-three.vercel.app/api/auth/me
curl -s -o /dev/null -w '%{http_code} %{time_total}s\n' \
  https://prism-gamma-three.vercel.app/api/shares/abcdefghjk
```

**2. Find the cause on the VM.** Follow section 5 of the private runbook ("My app
can't connect"), working outward: port reachable → services active → `pg_hba`
rejections → fail2ban bans → memory (`free -m`, `dmesg -T | grep -i oom`).

**3. Recover.** When the database answers through the pooler again, delete
`CHROMIQ_ACCOUNTS` (or set it to `on`) in Vercel, redeploy, and re-run the
health checks above. The share lookup should return 404 in well under a second.

## A bad deploy reached production

Every push to `main` deploys, whether or not CI passes.

1. **Roll back first, debug second.** Vercel → project `prism` → Deployments →
   the last good production deployment → **Instant Rollback** (or **Promote to
   Production**).
2. After a rollback, Vercel may stop auto-promoting new pushes until you promote
   a deployment by hand. Check for the banner on the project page before
   assuming the next push went live.
3. Fix forward with `git revert <sha>` on a branch, let CI pass, merge, and
   confirm the new deployment is the one serving production.

The Vercel CLI is not installed on the maintainer's machine. To use it:
`npm i -g vercel`, then `vercel rollback`.

## Turning accounts on in production

As of 2026-10-30 production has no environment variables. To enable accounts:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **pooled** `prism_app` URL on port **6432**, with `sslmode=verify-full`, **without** an `sslrootcert=` path |
| `PGSSLROOTCERT` | the **full PEM text** of the private CA (the contents of `~/.config/db-project/ca.crt`, not the path) |
| `NEXT_PUBLIC_SITE_URL` | the public origin, once the domain is decided |

`SESSION_SECRET` is documented in `.env.example` but **never read**. Sessions
are random tokens hashed with SHA-256
([ADR-0007](adr/0007-opaque-hashed-sessions.md)). Leave it unset.

After redeploying, run the health checks. A TLS error here means the CA is
missing or was given as a path. See [TLS verification fails](#tls-verification-fails).

## Migrations

Preconditions. Each of these has failed at least once:

1. **Node 20 or later.** Node 18 fails with "yargs parser supports a minimum
   Node.js version of 20".
2. **The tunnel is open.** `DIRECT_URL` points at `127.0.0.1:15432`. Without the
   tunnel the failure is a bare `ECONNREFUSED`.
3. **Never run migrations through `:6432`.** See the next section for what
   happens when you do.

```bash
cd ~/prism
export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"
~/bin/db-tunnel -d                      # opens 127.0.0.1:15432

npm run migrate -- up --dry-run         # read what it will do
npm run migrate:up                      # apply
npm run migrate:down                    # roll back the last one, if needed

# close the tunnel: find the listener on :15432 and kill that pid
ss -ltnpH 'sport = :15432'
```

New migration: `npm run migrate:create -- <name>`, then write both the up and
the down section in plain SQL. Constraints that come from the role design:

- No `CREATE EXTENSION`, and no `CREATE SCHEMA` (even `IF NOT EXISTS`).
  `prism_owner` has DDL on schema `prism` only, and the privilege check runs
  before the existence check.
- `gen_random_uuid()` is built in; no `pgcrypto` is needed.
- New tables grant DML to `prism_app` automatically through default privileges.
  Confirm after applying:
  `SELECT has_table_privilege('prism_app', 'prism.<table>', 'INSERT');`

If the script prints its usage text and exits 1 without touching the database,
something has moved `--schema=prism` back to the end of the command. It must
come before `-d DIRECT_URL`, or it swallows the `up` subcommand.

## "Another migration is already running"

Cause: a migration was run through the pooler. node-pg-migrate took a session
advisory lock, PgBouncer handed the connection back to its pool, and the lock
now sits on an idle backend.

1. Confirm nothing is really migrating, and find the holder. As an admin on the
   VM:

   ```sql
   SELECT l.pid, a.usename, a.state, now() - a.state_change AS idle_for
   FROM pg_locks l JOIN pg_stat_activity a USING (pid)
   WHERE l.locktype = 'advisory';
   ```

2. If the holder is `idle`, terminate it: `SELECT pg_terminate_backend(<pid>);`
   PgBouncer reconnects on demand, so the app does not notice.
3. Re-run `npm run migrate:up` with locking on. It should take the lock, report
   "No migrations to run!" or apply, and release it.

`--no-lock` (yargs' negation of `--lock`) also gets you past this. Use it only
once you have confirmed that no other migration is running.

## TLS verification fails

| Message | Likely cause | Fix |
|---|---|---|
| `unable to verify the first certificate` | No CA reached the driver | Set `PGSSLROOTCERT` (PEM text on Vercel, a path locally) |
| `PGSSLROOTCERT is set to "…", which is neither PEM text nor a readable file` | A laptop path set in Vercel, or a typo | Paste the certificate's contents instead |
| Hostname or altname mismatch on the **tunnel** only | Postgres is serving a different certificate from PgBouncer, as in October 2026 | Check the server, don't relax the client ([ADR-0014](adr/0014-fix-server-tls-not-client.md)) |

Compare what each lane actually serves:

```bash
# direct lane, through the tunnel
openssl s_client -starttls postgres -connect 127.0.0.1:15432 \
  -CAfile ~/.config/db-project/ca.crt -verify_hostname 127.0.0.1 </dev/null 2>/dev/null \
  | grep -E 'subject=|issuer=|Verify return code'

# pooler lane
openssl s_client -starttls postgres -connect <db-host>:6432 \
  -CAfile ~/.config/db-project/ca.crt </dev/null 2>/dev/null \
  | grep -E 'subject=|issuer=|Verify return code'
```

Both should show the private root CA as issuer and `Verify return code: 0`. If
the direct lane shows a self-signed certificate named after the VM, the
`conf.d/20-ssl.conf` override is missing again. Restore it and reload Postgres
with `SIGHUP` (`systemctl reload postgresql@16-main`), which does not drop
connections.

## Housekeeping tables

Sessions are pruned at sign-in, and shares when a share is created.
`rate_limits` is **never** pruned automatically (failure mode D11). Until
something calls `pruneRateLimits`, clear old windows by hand as `prism_owner`:

```sql
DELETE FROM prism.rate_limits WHERE window_start < now() - interval '1 day';
```

## Local build and dev problems

| Symptom | Fix |
|---|---|
| `next` dies with SIGBUS / "Bus error (core dumped)" | The SWC native binary was truncated by an interrupted install. Run `npm ci`. The `gnu` binding should be ~143 MB. |
| `EADDRINUSE`, or the page loads without CSS | An old `next start` still owns the port. Find it with `ss -ltnpH 'sport = :3000'` and kill that pid. **Do not** use `pkill -f "next start"`: it matches, and kills, your own shell. |
| `SyntaxError … 'node:util' does not provide an export named 'styleText'` | Tests are running on Node 18. Switch to Node 22. |
| Every account route takes 10 s locally | `.env.local` points at a database you can't reach. Set `CHROMIQ_ACCOUNTS=off` in `.env.local`. |
