-- Up Migration

-- In-product feedback (CHROMIQ-1007).
--
-- The user story is "report a site that will not load WITHOUT leaving the
-- app", which a mailto: link does not satisfy: it leaves the app, needs a
-- configured mail client, and loses the context the app already knows. So the
-- message lands here instead.
--
-- Unlike telemetry_events, this table does hold personal data -- someone can
-- write anything in a free-text box, and the contact address is theirs. It is
-- therefore disclosed in the privacy policy, kept for a bounded time, and
-- deletable on request. The two are deliberately separate tables for exactly
-- that reason: one is anonymous diagnostics, the other is correspondence, and
-- merging them would drag the diagnostics into the same obligations.
--
-- No IP address is stored. Abuse is handled by the rate limiter, which keys on
-- the address without writing it here.
CREATE TABLE feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- 'site' when a page would not load, 'bug', or 'idea'.
  topic        text NOT NULL,
  -- What the person wrote. Length-capped by the route.
  message      text NOT NULL,
  -- The address that failed, when the report came from a failed load. Null
  -- when the person removed it, which the form lets them do.
  subject_url  text,
  -- Optional, and only so a reply is possible. Null when not given.
  contact      text,
  -- Set when the sender happened to be signed in, so a reply can be tied to
  -- an account without asking twice. Null for anonymous reports, and the
  -- report survives the account being deleted.
  user_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  -- The deployment, so a report can be matched to what was running.
  release      text,
  -- Set once the report has been dealt with, so the list can be worked
  -- through rather than re-read.
  handled_at   timestamptz,
  CONSTRAINT feedback_topic_check CHECK (topic IN ('site', 'bug', 'idea'))
);

CREATE INDEX feedback_created_at_idx ON feedback (created_at DESC);
CREATE INDEX feedback_unhandled_idx
  ON feedback (created_at DESC)
  WHERE handled_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS feedback;
