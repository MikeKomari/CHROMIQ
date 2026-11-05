# CHROMIQ architecture

Two levels of zoom. **L0** shows CHROMIQ as one box among the people and systems
it touches. **L1** opens that box into its deployable parts. The diagrams are
Mermaid, so they render on GitHub. Decisions behind the shapes are in
[`adr/`](adr/README.md).

As of 2026-11-05.

## L0: system context

```mermaid
flowchart LR
  visitor(["Visitor<br/>(no account, the default)"])
  member(["Signed-in user<br/>(optional, for cross-device sync)"])
  owner(["Operator<br/>(the maintainer's laptop)"])

  chromiq["<b>CHROMIQ</b><br/>Next.js app on Vercel<br/>prism-gamma-three.vercel.app"]

  sites[("Third-party websites<br/>pages to restyle or import")]
  db[("Postgres VM<br/>accounts · sync · share links · rate limits")]
  github["GitHub<br/>MikeKomari/CHROMIQ<br/>CI on main and PRs"]

  visitor -- "tunes tokens, restyles a URL, exports" --> chromiq
  member -- "same, plus sync and short links" --> chromiq
  chromiq -- "server-side fetch, SSRF-guarded" --> sites
  visitor -.->|"bookmarklet loads widget on a site"| sites
  chromiq -- "TLS verify-full via PgBouncer :6432" --> db
  owner -- "git push" --> github
  github -- "Vercel Git integration deploys main" --> chromiq
  owner -- "SSH tunnel, migrations as prism_owner" --> db
```

What to notice:

- **The database is optional.** With no `DATABASE_URL`, or with
  `CHROMIQ_ACCOUNTS=off`, CHROMIQ is a fully working local-only tool
  ([ADR-0001](adr/0001-local-first-accounts-opt-in.md),
  [ADR-0010](adr/0010-explicit-accounts-flag.md)). As of 2026-10-30 production
  ran this way: the Vercel project had no environment variables set.
- **CHROMIQ makes outbound requests to arbitrary sites** on a visitor's
  instruction. That is the largest attack surface, and it is why the proxy is
  built the way it is ([ADR-0011](adr/0011-restyle-proxy-script-free-sandbox.md)).
- **Production deploys come from the Vercel Git integration on every push to
  `main`.** The `v*`-tag workflow in `.github/workflows/deploy.yml` has never
  run, so tagging is not how releases happen today.

## L1: containers

```mermaid
flowchart TB
  subgraph browser["Browser"]
    landing["Landing page /<br/>scroll primitives, Lenis"]
    workspace["Workspace /workspace<br/>token model, preview, export"]
    ls[("localStorage<br/>chromiq-tokens / -projects / -settings")]
    iframe["Restyle preview iframe<br/>sandbox=allow-same-origin, no scripts"]
    workspace --- ls
    workspace --> iframe
  end

  subgraph vercel["Vercel Functions: Next.js route handlers, Node runtime"]
    proxy["/api/proxy<br/>fetch + sanitise page"]
    inspect["/api/inspect<br/>extract CSS tokens"]
    auth["/api/auth/*<br/>signup · login · logout · me"]
    sync["/api/projects, /api/projects/[id]<br/>revision-checked sync"]
    shares["/api/shares, /api/shares/[slug]<br/>short links"]
    memrl["in-memory limiter<br/>per instance"]
    dbrl["Postgres limiter<br/>falls back to memory"]
    flag{{"accountsEnabled()<br/>CHROMIQ_ACCOUNTS + DATABASE_URL"}}
    pool["lib/db.ts pool<br/>max 10 · connect timeout 10 s<br/>CA from PGSSLROOTCERT"]
  end

  subgraph vm["Postgres VM (single node)"]
    bouncer["PgBouncer :6432<br/>transaction pooling<br/>userlist: app roles only"]
    pg[("Postgres 16 :5432<br/>appdb, schema prism")]
    sshd["sshd :22<br/>tunnel lane for admins"]
    backup["pg-backup timer<br/>nightly, 14-day retention"]
    bouncer --> pg
    sshd -.->|"127.0.0.1:15432"| pg
    backup --> pg
  end

  sites[("Third-party sites")]

  workspace -- "fetch" --> proxy & inspect & auth & sync & shares
  proxy --> memrl
  inspect --> memrl
  proxy -- "safeFetch: IP check per hop,<br/>10 s, 2 MB, 4 redirects" --> sites
  inspect -- "safeFetch + stylesheets" --> sites
  auth & sync & shares --> flag
  auth & shares --> dbrl
  flag -- "enabled" --> pool
  dbrl --> pool
  pool -- "TLS verify-full" --> bouncer
```

### What lives where

| Part | Code | State it owns | Needs the database? |
|---|---|---|---|
| Landing page | `app/page.tsx`, `components/landing/`, `components/scroll/` | none | No |
| Workspace | `components/workspace*`, `hooks/use-workspace.ts`, `lib/tokens.ts`, `lib/exporters.ts` | tokens, projects, snapshots, versions, in `localStorage` | No |
| Restyle proxy | `app/api/proxy/route.ts`, `lib/safe-fetch.ts`, `lib/url-safety.ts`, `lib/sanitize-html.ts` | none | No |
| URL import | `app/api/inspect/route.ts`, `lib/css-extract.ts` | none | No |
| Accounts | `app/api/auth/*`, `lib/server/sessions.ts`, `lib/server/passwords.ts` | `users`, `auth_identities`, `sessions` | Yes |
| Cloud sync | `app/api/projects/*`, `lib/sync.ts`, `hooks/use-account.ts` | `projects`, `project_versions` | Yes |
| Short links | `app/api/shares/*`, `lib/server/shares.ts` | `shares` | Yes; the client falls back to `?share=` |
| Shared rate limit | `lib/server/rate-limit-db.ts` | `rate_limits` | Prefers it; falls back to memory |
| Feature gate | `lib/server/features.ts` | none | Reads `CHROMIQ_ACCOUNTS`, `DATABASE_URL` |
| Bookmarklet | `public/chromiq-widget.js`, `lib/bookmarklet.ts` | none | No |

### Schema (`migrations/1729670000000_init.sql`)

```mermaid
erDiagram
  users ||--o{ auth_identities : "has (provider, provider_id)"
  users ||--o{ sessions : "has (token stored as sha256)"
  users ||--o{ projects : owns
  projects ||--o{ project_versions : "history"
  users |o--o{ shares : "creates (null when signed out)"
  projects |o--o{ shares : "optional source (SET NULL)"
  rate_limits {
    text bucket
    text subject
    timestamptz window_start
    int count
  }
```

Every foreign key to `users` is `ON DELETE CASCADE`, which is what makes
`DELETE /api/auth/me` a complete account deletion.

### Environments

| | Local dev | Production (Vercel project `prism`) |
|---|---|---|
| URL | `http://localhost:3000` | `https://prism-gamma-three.vercel.app`. Other `*.vercel.app` aliases sit behind Vercel Authentication. |
| Accounts | On when `.env.local` has `DATABASE_URL` | Off. No env vars were set as of 2026-10-30. |
| Database lane | pooled `DATABASE_URL` for the app, tunnel `DIRECT_URL` for migrations | pooled `DATABASE_URL` only |
| CA for TLS | `PGSSLROOTCERT` as a file path | `PGSSLROOTCERT` as PEM text |
| Node | 22 (via nvm; the system Node 18 breaks tests and migrations) | Vercel default |
| CI | — | GitHub Actions on Node 20: lint → typecheck → test → build, on pushes to `main` and on PRs |
