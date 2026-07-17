-- Anonymous players, per-device bearer tokens (hash-only), JSON-blob saves.
-- Identity: token in device localStorage; save code for cross-device claim.

CREATE TABLE players (
  id TEXT PRIMARY KEY,             -- crypto.randomUUID()
  code TEXT NOT NULL UNIQUE,       -- short human save code (unambiguous alphabet)
  created_at TEXT NOT NULL         -- ISO timestamp
);

CREATE TABLE tokens (
  token_hash TEXT PRIMARY KEY,     -- SHA-256 (hex) of the bearer token
  player_id TEXT NOT NULL REFERENCES players(id),
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL
);

CREATE INDEX idx_tokens_player ON tokens(player_id);

CREATE TABLE saves (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  payload_json TEXT NOT NULL,      -- SaveState JSON blob (validated on write)
  version INTEGER NOT NULL DEFAULT 1,  -- optimistic-concurrency counter
  updated_at TEXT NOT NULL         -- server-owned ISO timestamp
);
