-- 内容森林：果实系统事实表
-- 依据：
-- - docs/design/domain/果实领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-fruit-module/specs/fruit-management/spec.md
--
-- 约束说明：
-- - 果实 Markdown 正文属于内容本体，只通过 content_location 指向内容访问层中的文件。
-- - 本表只维护系统事实：身份、物竞天择状态、父节点引用、内容位置、摘要、基因标签与审计信息。
-- - 不提供删除语义；不感兴趣的果实通过 selection_state = 'eliminated' 表达。
-- - parent_node_type 只表达创建时挂载来源；是否可继续生长由枝化生长领域结合生长锁判断。

CREATE TABLE IF NOT EXISTS fruits (
  id TEXT PRIMARY KEY,
  selection_state TEXT NOT NULL DEFAULT 'candidate' CHECK (selection_state IN ('candidate', 'selected', 'eliminated')),
  parent_node_id TEXT NOT NULL,
  parent_node_type TEXT NOT NULL CHECK (parent_node_type IN ('seed', 'fruit')),
  content_location TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  gene_tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fruits_parent_node_updated_at
  ON fruits (parent_node_type, parent_node_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_fruits_selection_state_updated_at
  ON fruits (selection_state, updated_at);
