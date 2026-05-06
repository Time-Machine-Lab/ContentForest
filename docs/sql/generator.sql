-- 内容森林：生成器系统事实表
-- 依据：
-- - docs/design/domain/生成器领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-generator-module/specs/generator-management/spec.md
--
-- 约束说明：
-- - 生成器 Skill 本体属于内容本体，只通过 content_location 指向内容访问层中的文件夹。
-- - 本表只维护系统事实：身份、名称、描述、启用状态、内容位置与审计信息。
-- - 不提供删除语义；停用通过 enable_state 表达。
-- - 不要求 Skill 本体包含 generator.json 或内容森林专用 manifest。

CREATE TABLE IF NOT EXISTS generators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  enable_state TEXT NOT NULL DEFAULT 'enabled' CHECK (enable_state IN ('enabled', 'disabled')),
  content_location TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_generators_enable_state_updated_at
  ON generators (enable_state, updated_at);
