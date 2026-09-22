export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS openings (
    id TEXT PRIMARY KEY,
    regional TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    fields TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE INDEX IF NOT EXISTS idx_openings_active_regional
    ON openings (active, regional)`,
  `CREATE TABLE IF NOT EXISTS scrape_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    ok INTEGER NOT NULL DEFAULT 0,
    regional TEXT,
    row_count INTEGER,
    content_hash TEXT,
    error TEXT,
    new_count INTEGER,
    gone_count INTEGER,
    changed_count INTEGER
  )`,
];

export function summarize(vacancy, identityCellNames) {
  return identityCellNames
    .map((name) => vacancy[name])
    .filter(Boolean)
    .join(" | ");
}
