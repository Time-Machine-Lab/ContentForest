-- Content Forest: publication verification system facts.
--
-- Contract notes:
-- - A publication record represents one external publication verification fact
--   for one fruit.
-- - The first phase only supports the built-in manual publisher.
-- - published_at is generated with record creation time and is not user-editable.
-- - This table does not model deletion, archive, metrics, feedback snapshots,
--   platform enums, external publisher credentials, or screenshot attachments.

CREATE TABLE IF NOT EXISTS publication_records (
  id TEXT PRIMARY KEY,
  fruit_id TEXT NOT NULL,
  publisher_type TEXT NOT NULL DEFAULT 'manual' CHECK (publisher_type = 'manual'),
  publication_target TEXT NOT NULL,
  publication_evidence TEXT NOT NULL,
  publication_note TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publication_records_fruit_published_at
  ON publication_records (fruit_id, published_at);
