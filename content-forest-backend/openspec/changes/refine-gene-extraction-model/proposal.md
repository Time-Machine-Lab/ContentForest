## Why

当前基因汲取更像静态建议生成，模型还不够“证据驱动、可追踪、可迭代”。我们需要把用户在选择/淘汰时输入的原因、证据权重和后续追踪机制纳入同一套模型里，才能支撑后续的持续进化。

## What Changes

- 调整基因汲取输入模型，支持携带用户对本次选择/淘汰/验证的原因说明。
- 强化内容进化策略模型，使其显式表达证据驱动、相关性筛选、因果验证和版本迭代。
- 让基因汲取结果更明确地区分正向基因、负向基因和后续可复用方向。
- 让 Agent 输出与后端落地之间的边界更清晰，避免把“判断”与“沉淀”混在一起。
- 需要同步更新基因汲取相关 API 和存储契约。

## Capabilities

### New Capabilities
- `gene-extraction-reasoned-input`: 基因汲取任务支持携带用户原因说明与事件上下文。

### Modified Capabilities
- `content-evolution-strategy`: 内容进化策略需要从静态策略表达调整为证据驱动、可迭代的模型。
- `gene-extraction-agent-connection`: 基因汲取 Agent 输入/输出契约需要纳入原因说明和策略版本信息。
- `gene-extraction-agent-skill`: 基因汲取 Skill 的输出语义需要更明确地表达正向/负向基因、证据权重和下一轮使用方式。
- `gene-extraction`: 基因汲取领域需要接收新的输入语义，并将其纳入提醒、任务和建议流转。

## Impact

- 后端契约：`docs/api/gene.yaml`、`docs/sql/gene.sql`。
- 后端领域与应用：基因汲取领域、内容进化策略、Agent 对接与任务输入整理。
- Agent 相关文档：`docs/design/内容森林Agent架构设计文档.md`、`docs/design/基因汲取Agent对接契约.md`。
- 开发规范：`docs/spec/后端开发规范文档.md`。
