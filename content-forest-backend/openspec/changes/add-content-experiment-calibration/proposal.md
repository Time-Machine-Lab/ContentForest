## Why

当前内容森林已经能生成和筛选果实，但用户判断“这颗果实投放到平台后可能表现如何”仍主要依赖人工阅读，缺少可复盘、可校准的结构化评测依据。基于 `docs/design/domain/内容实验校准领域模块设计文档.md`，本变更先落地“果实评测员 / 预测图 MVP”，让任意果实都能获得面向传播实验的预测图，用于辅助物竞天择与后续校准闭环。

## What Changes

- 新增内容实验校准领域的首个后端能力：对任意果实执行评测并生成/刷新当前预测图。
- 新增默认评分画像与画像版本记录，用于表达系统当前如何判断果实的传播适配度。
- 新增预测图持久化与读取能力；预测图作为系统事实保存，不写入果实 Markdown 正文。
- 新增果实评测 Agent Skill，参考 `cheat-on-content` 的 `cheat-score` 与 `cheat-score-blind` 思路：结构化评分、盲评边界、污染输入拒绝、结构化输出校验。
- 扩展 Agent Runtime 的允许任务类型与 Trace 语义，支持 `fruit_evaluation` 类型任务。
- 新增只读 Tool，用于在评测任务中读取授权果实正文与评分画像；评测 Agent 不得读取发布后数据、反馈快照、校准复盘或会泄露真实表现的资料。
- 新增顶层 API 契约文档 `docs/api/content-experiment-calibration.yaml`，由单一内容实验校准 Controller 对应。
- 新增顶层 SQL 文档，按“一张表一个 `.sql`”拆分为 `docs/sql/evaluation_profiles.sql` 与 `docs/sql/fruit_prediction_maps.sql`。
- 本次不实现预测快照冻结、发布后校准复盘、基因汲取证据交付、评分画像自动修订、虚拟用户模拟或真实平台算法模拟。

## Capabilities

### New Capabilities

- `content-experiment-calibration`: 定义评分画像、果实预测图、预测图生成/刷新/读取、持久化、API/SQL 契约和非承诺边界。
- `fruit-evaluation-agent-skill`: 定义内置果实评测 Agent Skill 的注册、只读上下文读取、盲评边界、结构化预测图输出、Schema 校验、自检修复和 Trace 规则。

### Modified Capabilities

- `agent-core-runtime`: 允许 Agent Runtime 执行 `fruit_evaluation` 任务，并记录预测图评测所需的盲评、Tool 调用、结构化校验与失败 Trace。

## Impact

- 顶层文档：新增 `docs/api/content-experiment-calibration.yaml`、`docs/sql/evaluation_profiles.sql`、`docs/sql/fruit_prediction_maps.sql`，并在实现前完成契约定义。
- 后端模块：新增内容实验校准模块的 domain/application/infrastructure/controller 层。
- Agent：新增内置果实评测 Skill、只读果实评测 Tool、结构化输出 Schema 与任务类型装配。
- 果实模块：只提供授权果实详情读取能力给校准模块复用，不改变果实创建、正文编辑、物竞天择状态或发布判断规则。
- 前端依赖：前端预测图 UI 必须以本变更新增 API 契约为唯一数据来源。
