-- 内容森林：枝化生长系统事实表
-- 依据：
-- - docs/design/domain/枝化生长领域模块设计文档.md
-- - docs/design/内容森林Agent架构设计文档.md
-- - content-forest-backend/openspec/changes/add-branch-growth-module/specs/branch-growth/spec.md
-- - content-forest-backend/openspec/changes/connect-branch-growth-agent/specs/branch-growth-agent-connection/spec.md
--
-- 约束说明：
-- - 生长任务是一次枝化生长批次，不是通用后台任务系统。
-- - 任务状态、来源节点、生长锁、内部尝试、最近失败输入都属于数据库维护的系统事实。
-- - Markdown 不保存任何生长任务 meta；Agent 输出必须由后端校验后交付果实领域落地。
-- - 同一来源节点同一时间只能有一个生长锁；其他节点不受影响。
-- - 异步执行不新增表；运行中任务、后台 attempts、来源节点锁和失败输入继续由下列表维护。
-- - 内容解空间地图、平台推断、候选探索路线、参考原子摘要等任务级策略元数据使用
--   growth_tasks.agent_input_json 保存摘要，不建模为长期领域聚合。
-- - attempt 级选中探索路线、参考计划、参考原子、slot-action 路由、planned usage
--   和突变算子使用 growth_attempts.mutation_plan_json 的 additive 字段保存。
-- - Agent/Skill 返回的路线级 Trace、候选 meta、actual usage、风险处理摘要和事实检查摘要
--   使用 growth_attempts.agent_output_json 保存。
-- - 第一版不新增独立路线表；历史任务缺少这些 JSON 字段时必须按现有 search_mode、
--   mutation_intensity 和 mutation_plan_json 降级解释。
-- - provided/planned/actual 三层参考使用摘要只表达关联与使用状态，不表达精确权重
--   或营养导致果实成功/失败的因果结论。
-- - media_refs_json 保存本轮授权媒体输入及用途说明；媒体输入可以进入 ReferenceAtom、
--   planned usage 和 actual usage，但生成过程中产生的新媒体输出不得写入 media_refs_json。

CREATE TABLE IF NOT EXISTS growth_tasks (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  user_input TEXT NOT NULL DEFAULT '',
  generator_id TEXT NOT NULL,
  fruit_count INTEGER NOT NULL CHECK (fruit_count >= 1 AND fruit_count <= 6),
  nutrient_refs_json TEXT NOT NULL DEFAULT '[]',
  temporary_nutrient_card_refs_json TEXT NOT NULL DEFAULT '[]',
  media_refs_json TEXT NOT NULL DEFAULT '[]',
  gene_refs_json TEXT NOT NULL DEFAULT '[]',
  detail_params_json TEXT NOT NULL DEFAULT '{}',
  search_mode TEXT NOT NULL DEFAULT 'broad_exploration' CHECK (search_mode IN ('broad_exploration', 'directional_strengthening', 'local_variation', 'negative_feedback_avoidance')),
  mutation_intensity TEXT NOT NULL DEFAULT 'balanced' CHECK (mutation_intensity IN ('conservative', 'balanced', 'aggressive')),
  pipeline_recommendation_reason TEXT NOT NULL DEFAULT '',
  authorization_refs_json TEXT NOT NULL DEFAULT '[]',
  -- agent_input_json 可包含 contentSearchMap、platformInference、routeCandidates、
  -- referenceAtoms、providedReferenceUsage 等 additive 策略摘要。
  agent_input_json TEXT NOT NULL DEFAULT '{}',
  successful_fruit_ids_json TEXT NOT NULL DEFAULT '[]',
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_source_status_updated_at
  ON growth_tasks (source_node_type, source_node_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_seed_updated_at
  ON growth_tasks (seed_id, updated_at);

CREATE TABLE IF NOT EXISTS growth_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  attempt_index INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  agent_task_id TEXT,
  fruit_id TEXT,
  failure_reason TEXT,
  agent_output_json TEXT NOT NULL DEFAULT '{}',
  -- mutation_plan_json 必须继续兼容 direction/intent/intensity/hypothesis/inherit/avoid/evidenceSummary。
  -- 新增 selectedRoute、referencePlan、referenceAtoms、plannedReferenceUsage、
  -- mutationOperators、platformInference、routeTrace 等字段时，
  -- 不得要求历史 attempt 具备这些字段，也不得移除现有突变计划字段。
  mutation_plan_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (task_id, attempt_index)
);

CREATE INDEX IF NOT EXISTS idx_growth_attempts_task_attempt_index
  ON growth_attempts (task_id, attempt_index);

CREATE TABLE IF NOT EXISTS growth_locks (
  source_node_id TEXT NOT NULL,
  source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
  task_id TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  PRIMARY KEY (source_node_type, source_node_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_locks_task_id
  ON growth_locks (task_id);

CREATE TABLE IF NOT EXISTS growth_failed_inputs (
  source_node_id TEXT NOT NULL,
  source_node_type TEXT NOT NULL CHECK (source_node_type IN ('seed', 'fruit')),
  task_id TEXT NOT NULL,
  seed_id TEXT NOT NULL,
  user_input TEXT NOT NULL DEFAULT '',
  generator_id TEXT NOT NULL,
  fruit_count INTEGER NOT NULL CHECK (fruit_count >= 1 AND fruit_count <= 6),
  nutrient_refs_json TEXT NOT NULL DEFAULT '[]',
  temporary_nutrient_card_refs_json TEXT NOT NULL DEFAULT '[]',
  media_refs_json TEXT NOT NULL DEFAULT '[]',
  gene_refs_json TEXT NOT NULL DEFAULT '[]',
  detail_params_json TEXT NOT NULL DEFAULT '{}',
  search_mode TEXT NOT NULL DEFAULT 'broad_exploration' CHECK (search_mode IN ('broad_exploration', 'directional_strengthening', 'local_variation', 'negative_feedback_avoidance')),
  mutation_intensity TEXT NOT NULL DEFAULT 'balanced' CHECK (mutation_intensity IN ('conservative', 'balanced', 'aggressive')),
  failure_reason TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (source_node_type, source_node_id)
);

CREATE INDEX IF NOT EXISTS idx_growth_failed_inputs_seed_updated_at
  ON growth_failed_inputs (seed_id, updated_at);
