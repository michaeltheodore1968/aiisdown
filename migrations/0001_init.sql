-- Current state of each platform, one row each. `data` is JSON (probes, feed
-- result, 24h slots, 30 day tallies) so a page view reads ten small rows.
CREATE TABLE IF NOT EXISTS platform_state (
  slug       TEXT PRIMARY KEY,
  status     TEXT NOT NULL,
  since      INTEGER NOT NULL,
  checked_at INTEGER NOT NULL,
  data       TEXT NOT NULL
);

-- Incidents reported by the vendors' own feeds, kept after they resolve.
CREATE TABLE IF NOT EXISTS incidents (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  impact      TEXT,
  status      TEXT,
  started_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_incidents_slug ON incidents (slug, started_at DESC);

-- Status changes we observed ourselves, independent of the vendors.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  at          INTEGER NOT NULL,
  summary     TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events (slug, at DESC);
