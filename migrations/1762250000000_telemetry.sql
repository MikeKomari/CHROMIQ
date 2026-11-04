-- Up Migration

-- Observability (CHROMIQ-1005), kept in the database CHROMIQ already has
-- rather than sent to a third party.
--
-- Choosing no vendor is the point. Every error reporter and product-analytics
-- service wants a script on the page and a copy of the traffic, and the
-- privacy policy would then have to name it, disclose the transfer, and track
-- its retention. One table here costs an INSERT and says exactly what is kept.
--
-- What is deliberately NOT in this table:
--
--   * no IP address, no account id, no session id, no cookie, no user agent
--     string. There is nothing here to join back to a person.
--   * no URL. The inspector and the proxy record WHY a fetch failed, not what
--     was fetched. That makes the top failure modes visible without this
--     table becoming a log of what people looked at. The cost is that it
--     cannot answer "which site breaks the proxy" on its own; the trade was
--     made on purpose, and the host's own request logs still hold the URL for
--     the window they keep it.
--
-- Without those, a row is not personal data, so there is no deletion request
-- to honour and no subject to identify.
CREATE TABLE telemetry_events (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  -- 'error' (an unhandled failure), 'failure' (a route that refused or gave
  -- up for a known reason), 'vital' (a Core Web Vitals measurement), or
  -- 'feature' (something was used).
  kind         text NOT NULL,
  -- Where it happened: 'client' or 'server'.
  surface      text NOT NULL,
  -- What it was: a route name, a feature name, or a metric name such as 'LCP'.
  name         text NOT NULL,
  -- Why, for a failure: a short machine-ish token such as 'timeout' or
  -- 'not-html'. Null for a measurement.
  reason       text,
  -- Free text for an error: the message and, where one exists, the digest that
  -- ties a client report to a server log line. Truncated by the writer.
  detail       text,
  -- The measurement, for a vital.
  value        double precision,
  -- The deployment this came from, so a spike can be tied to a release.
  release      text,
  CONSTRAINT telemetry_events_kind_check
    CHECK (kind IN ('error', 'failure', 'vital', 'feature')),
  CONSTRAINT telemetry_events_surface_check
    CHECK (surface IN ('client', 'server'))
);

-- Every question asked of this table is "what happened recently", so the index
-- leads with time and narrows by kind.
CREATE INDEX telemetry_events_occurred_at_idx
  ON telemetry_events (occurred_at DESC);
CREATE INDEX telemetry_events_kind_name_occurred_at_idx
  ON telemetry_events (kind, name, occurred_at DESC);

-- Down Migration

DROP TABLE IF EXISTS telemetry_events;
