-- Up Migration

-- gen_random_uuid() is built in from PostgreSQL 13, so no extension is
-- needed for the uuid defaults below. This used to run CREATE EXTENSION
-- pgcrypto to make the intent explicit, but installing an extension needs
-- CREATE on the database, which the migration role deliberately does not
-- have, and nothing here calls a pgcrypto function -- password hashing is
-- scrypt in the application, not crypt() in the database.

-- A person who opted in to syncing across devices. Logged-out users never
-- reach this table: their work stays in localStorage.
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness without requiring the citext extension.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

-- One row per way a user can sign in. Today provider is always 'password';
-- adding Google later is an INSERT path, not a schema rewrite.
CREATE TABLE auth_identities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider       text NOT NULL,
  provider_id    text NOT NULL,
  password_hash  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_id_key UNIQUE (provider, provider_id),
  -- A password identity must carry a hash; a future OAuth identity must not.
  CONSTRAINT auth_identities_password_hash_check
    CHECK ((provider = 'password') = (password_hash IS NOT NULL))
);

CREATE INDEX auth_identities_user_id_idx ON auth_identities (user_id);

-- Opaque session tokens. Only the hash is stored, so a database leak does not
-- hand over live sessions.
CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  user_agent    text
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- A synced token system. `data` holds the serialized workspace project exactly
-- as the client models it; `schema_version` lets the client migrate old shapes.
CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name            text NOT NULL,
  data            jsonb NOT NULL,
  schema_version  integer NOT NULL DEFAULT 1,
  -- Bumped on every write so concurrent edits can be detected rather than
  -- silently overwriting each other.
  revision        integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX projects_user_id_updated_at_idx
  ON projects (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- Committed points in a project's history.
CREATE TABLE project_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_versions_project_id_created_at_idx
  ON project_versions (project_id, created_at DESC);

-- Short read-only share links. The token system is snapshotted into `data` so
-- a shared link keeps showing what was shared even if the project moves on,
-- and so sharing never exposes the project id.
CREATE TABLE shares (
  slug        text PRIMARY KEY,
  user_id     uuid REFERENCES users (id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects (id) ON DELETE SET NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  view_count  bigint NOT NULL DEFAULT 0
);

CREATE INDEX shares_user_id_idx ON shares (user_id);
CREATE INDEX shares_expires_at_idx ON shares (expires_at) WHERE expires_at IS NOT NULL;

-- Fixed-window rate limiting shared across serverless instances. Replaces the
-- per-process counters in lib/rate-limit.ts, which each warm instance kept to
-- itself.
CREATE TABLE rate_limits (
  bucket        text NOT NULL,
  subject       text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject, window_start)
);

CREATE INDEX rate_limits_window_start_idx ON rate_limits (window_start);

-- Down Migration

DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS shares;
DROP TABLE IF EXISTS project_versions;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS auth_identities;
DROP INDEX IF EXISTS users_email_lower_key;
DROP TABLE IF EXISTS users;
-- pgcrypto is intentionally left installed: other schemas in this database may
-- depend on it, and dropping a shared extension is not this migration's call.
