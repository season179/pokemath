-- Learning-quality telemetry (issue #24). One row per client event.
--
-- Privacy: rows key on better-auth's opaque user id (never playerName/email);
-- props_json holds only registry-validated, free-text-free properties
-- (shared/telemetry.ts). Rows expire TELEMETRY_RETENTION_DAYS (90) after
-- receipt via the daily cron purge in src/index.ts — received_at (server
-- clock) is the retention anchor; occurred_at (client clock) is analysis-only.

CREATE TABLE events (
  user_id TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  event_id TEXT NOT NULL,           -- client-minted; dedupe key for retries
  name TEXT NOT NULL,               -- registry event name
  occurred_at TEXT NOT NULL,        -- client-clock ISO timestamp
  received_at TEXT NOT NULL,        -- server-clock ISO timestamp
  props_json TEXT NOT NULL,         -- validated properties, ≤ 512 bytes
  PRIMARY KEY (user_id, event_id)
);

-- The learning report aggregates by name over a time window.
CREATE INDEX events_name_received_idx ON events (name, received_at);
