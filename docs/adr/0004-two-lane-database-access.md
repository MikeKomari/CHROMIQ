# ADR-0004: Two access lanes, with admin roles absent from the pooler

- **Status:** Accepted
- **Date:** 2026-10-23
- **Source:** the private database runbook, section 1

## Decision

Chose **two lanes, with apps on PgBouncer (6432, open to the internet) and
admins on an SSH tunnel or an IP-allowlisted 5432, and only the `*_app` roles
listed in PgBouncer's `userlist.txt`** over **one public port gated by
`pg_hba.conf` rules**, because:

- Vercel functions have no stable egress IP, so the app port cannot be
  allowlisted.
- Connections arriving through PgBouncer reach Postgres from `127.0.0.1`, so
  `pg_hba.conf` cannot tell a Vercel request from a local admin. Allowing admin
  roles from loopback would let anyone on the internet authenticate as an admin
  through the pooler.

Leaving the admin roles out of the pooler's user list makes them unreachable
from the internet by construction, not by a rule someone could mis-edit later.

## Context

The database is shared between two projects. Each has an `*_owner` role (DDL on
its own schema, used for migrations) and an `*_app` role (DML only). No role has
SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS.

## Consequences

- `DATABASE_URL` (runtime) and `DIRECT_URL` (migrations) are different hosts,
  ports and roles. Mixing them up is a known failure; see
  [ADR-0005](0005-sql-migrations-over-direct-url.md).
- Least privilege bites the tooling. `CREATE EXTENSION` and
  `CREATE SCHEMA IF NOT EXISTS` both fail as `prism_owner`, because the
  privilege check runs before the existence check (commits `10ce284`,
  `dc8490b`).
- `ALTER DEFAULT PRIVILEGES` grants DML to `prism_app` on every new table
  automatically. This was verified on 2026-10-30.
