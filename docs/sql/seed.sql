-- 内容森林：种子系统事实表
-- 依据：
-- - docs/design/domain/种子领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-seed-module/specs/seed-management/spec.md
--
-- 约束说明：
-- - Markdown 正文属于内容本体，只通过 content_location 指向内容访问层中的文件。
-- - 本表只维护系统事实：身份、标题、归档状态、根节点语义、内容位置与审计信息。
-- - 不提供删除语义；归档通过 archive_state 表达。

CREATE TABLE IF NOT EXISTS seeds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
  content_location TEXT NOT NULL,
  root_node_id TEXT NOT NULL UNIQUE,
  root_node_type TEXT NOT NULL DEFAULT 'seed' CHECK (root_node_type = 'seed'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_seeds_archive_state_updated_at
  ON seeds (archive_state, updated_at);

