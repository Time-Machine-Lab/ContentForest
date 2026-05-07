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
