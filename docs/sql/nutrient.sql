-- 内容森林：营养库系统事实表
-- 依据：
-- - docs/design/domain/营养库领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-nutrient-library-module/specs/nutrient-library-management/spec.md
--
-- 约束说明：
-- - 营养内容 Markdown 正文属于内容本体，只通过 content_location 指向内容访问层中的文件。
-- - 本文件只维护系统事实：营养库身份、作用域、归属种子、归档状态、营养内容归属、内容位置与审计信息。
-- - Markdown 不保存数据库维护的 meta 信息。
-- - 营养库和营养内容不提供硬删除语义；归档通过 archive_state 表达。
-- - 公共营养库 seed_id 必须为空；种子专属营养库 seed_id 必须非空，且作用域创建后不可变。
-- - 营养卡片是种子级候选资料，不能属于公共营养库；沉淀后通过 settled_content_id 关联正式营养内容。

CREATE TABLE IF NOT EXISTS nutrient_libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL CHECK (scope IN ('public', 'seed_scoped')),
  seed_id TEXT,
  archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  CHECK (
    (scope = 'public' AND seed_id IS NULL)
    OR
    (scope = 'seed_scoped' AND seed_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_nutrient_libraries_scope_archive_updated_at
  ON nutrient_libraries (scope, archive_state, updated_at);

CREATE INDEX IF NOT EXISTS idx_nutrient_libraries_seed_archive_updated_at
  ON nutrient_libraries (seed_id, archive_state, updated_at);

CREATE TABLE IF NOT EXISTS nutrient_contents (
  id TEXT PRIMARY KEY,
  library_id TEXT NOT NULL,
  title TEXT NOT NULL,
  archive_state TEXT NOT NULL DEFAULT 'active' CHECK (archive_state IN ('active', 'archived')),
  content_location TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_nutrient_contents_library_archive_updated_at
  ON nutrient_contents (library_id, archive_state, updated_at);

CREATE TABLE IF NOT EXISTS nutrient_cards (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unsettled' CHECK (status IN ('unsettled', 'settled', 'archived')),
  content_location TEXT NOT NULL,
  settled_content_id TEXT,
  default_for_growth INTEGER NOT NULL DEFAULT 0 CHECK (default_for_growth IN (0, 1)),
  conversation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  settled_at TEXT,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_nutrient_cards_seed_status_updated_at
  ON nutrient_cards (seed_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_nutrient_cards_settled_content_id
  ON nutrient_cards (settled_content_id);

CREATE INDEX IF NOT EXISTS idx_nutrient_cards_seed_default_for_growth
  ON nutrient_cards (seed_id, default_for_growth);

CREATE TABLE IF NOT EXISTS nutrient_research_sessions (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  nutrient_card_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nutrient_research_sessions_seed_updated_at
  ON nutrient_research_sessions (seed_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_nutrient_research_sessions_card_updated_at
  ON nutrient_research_sessions (nutrient_card_id, updated_at);

CREATE TABLE IF NOT EXISTS nutrient_research_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent_task_id TEXT,
  trace_json TEXT NOT NULL DEFAULT '[]',
  failure_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nutrient_research_messages_session_created_at
  ON nutrient_research_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS nutrient_depositable_blocks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nutrient_depositable_blocks_session_created_at
  ON nutrient_depositable_blocks (session_id, created_at);
