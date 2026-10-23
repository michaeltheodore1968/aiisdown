-- One snapshot of the cross-service reliability comparison, taken just after
-- each month ends. `month` is the month it describes, as YYYY-MM.
CREATE TABLE IF NOT EXISTS monthly_reports (
  month      TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  data       TEXT NOT NULL
);
