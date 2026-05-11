-- 内容森林：基因汲取系统事实表
-- 依据：
-- - docs/design/domain/基因汲取领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-gene-extraction-module/specs/gene-extraction/spec.md
--
-- 约束说明：
-- - 基因建议是待确认草稿，只保存在数据库，不写入 Markdown。
-- - 正式基因经验的正文属于内容本体，只通过 content_location 指向基因库 Markdown。
-- - 数据库只维护系统事实：归属、状态、证据、谱系、生态位、内容位置和审计信息。
-- - 基因库是种子级资源，不与营养库混用。
-- - 不提供硬删除语义；正式基因经验通过 status = 'archived' 表达归档。

CREATE TABLE IF NOT EXISTS gene_libraries (
  seed_id TEXT PRIMARY KEY,
  content_location TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gene_extraction_reminders (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'handled', 'ignored')),
  evidence_sources_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gene_extraction_reminders_seed_status_updated_at
  ON gene_extraction_reminders (seed_id, status, updated_at);

CREATE TABLE IF NOT EXISTS gene_extraction_tasks (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  reminder_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  failure_reason TEXT,
  evidence_sources_json TEXT NOT NULL DEFAULT '[]',
  agent_input_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gene_extraction_tasks_seed_updated_at
  ON gene_extraction_tasks (seed_id, updated_at);

CREATE TABLE IF NOT EXISTS gene_suggestions (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  lineage TEXT NOT NULL DEFAULT '',
  niche TEXT NOT NULL DEFAULT '',
  evidence_sources_json TEXT NOT NULL DEFAULT '[]',
  semantics_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gene_suggestions_seed_status_updated_at
  ON gene_suggestions (seed_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_gene_suggestions_task_id
  ON gene_suggestions (task_id);

CREATE TABLE IF NOT EXISTS gene_insights (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  suggestion_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
  title TEXT NOT NULL,
  lineage TEXT NOT NULL DEFAULT '',
  niche TEXT NOT NULL DEFAULT '',
  content_location TEXT NOT NULL,
  evidence_sources_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_gene_insights_seed_status_updated_at
  ON gene_insights (seed_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_gene_insights_suggestion_id
  ON gene_insights (suggestion_id);

CREATE TABLE IF NOT EXISTS gene_usage_records (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  insight_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('growth_task', 'manual', 'publication', 'feedback')),
  source_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('positive', 'neutral', 'negative')),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gene_usage_records_seed_created_at
  ON gene_usage_records (seed_id, created_at);

CREATE INDEX IF NOT EXISTS idx_gene_usage_records_insight_created_at
  ON gene_usage_records (insight_id, created_at);

CREATE TABLE IF NOT EXISTS gene_performance_summaries (
  insight_id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  positive_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  last_used_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gene_performance_summaries_seed_score
  ON gene_performance_summaries (seed_id, score);
