-- Content Forest: data feedback system facts.
--
-- Contract notes:
-- - A monitor attachment belongs to one publication record.
-- - The first phase only supports the built-in manual monitor.
-- - A publication record can attach at most one monitor.
-- - Feedback snapshots are appendable and editable, but not deletable.
-- - performance_data_json stores free structured external performance facts.
-- - Future network observation results can be consumed by the feedback domain
--   as snapshot input candidates, but providers must not write these tables
--   directly or bypass monitor attachment rules.
-- - These tables do not judge success, calculate fitness, mutate fruit state,
--   mutate publication records, archive snapshots, or call external platforms.

CREATE TABLE IF NOT EXISTS feedback_monitor_attachments (
  id TEXT PRIMARY KEY,
  publication_record_id TEXT NOT NULL UNIQUE,
  monitor_type TEXT NOT NULL DEFAULT 'manual' CHECK (monitor_type = 'manual'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback_snapshots (
  id TEXT PRIMARY KEY,
  publication_record_id TEXT NOT NULL,
  monitor_attachment_id TEXT NOT NULL,
  performance_data_json TEXT NOT NULL,
  user_observation TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_snapshots_publication_captured_at
  ON feedback_snapshots (publication_record_id, captured_at);
