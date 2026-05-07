## Context

当前后端已经具备 Agent Core Runtime、枝化生长 Agent Skill、基因汲取领域模块和发布验证模块。基因汲取领域已经通过 `GeneService.startExtractionTask` 创建 `gene_extraction` 任务，并向 AgentPort 提供 `GeneExtractionAgentInput`，其中包含证据来源、果实证据 meta 和可引用基因经验 meta。

当前缺口在 Agent 侧：`gene_extraction` 任务尚无内置 Skill 处理，也缺少可按任务授权读取证据正文和既有基因经验正文的只读 Tool。现有枝化生长 Tool 可以读取来源节点和授权基因经验，但语义偏枝化生长，不能直接承担“多证据汲取”的职责。

本设计遵守 `docs/design/内容森林Agent架构设计文档.md` 的边界：Agent 是能力层，不拥有业务事实；Tool 只读；Agent 输出不直接落地。也遵守 `docs/design/基因汲取Agent对接契约.md`：基因模块准备输入并消费建议，Agent 不写数据库、不写文件、不修改果实、发布记录或基因经验状态。

## Goals / Non-Goals

**Goals:**

- 实现内置基因汲取 Skill，支持 Agent `gene_extraction` 任务类型。
- 通过只读 Tool 读取任务授权范围内的种子上下文、果实证据正文、发布验证证据和既有基因经验正文。
- 生成 1 到 3 条基因建议，并能被现有 GeneService 消费为待确认建议。
- 引入正向基因与反向基因语义，用于区分“值得保留/强化”和“应该规避/抑制”的表达经验。
- 引入相似基因关系提示，用于说明建议与既有基因经验的关系，但不自动合并。
- 建立结构化输出校验和有限修复流程，避免 Agent 返回不可消费结果。
- 在 Agent Trace 中记录读取证据、读取既有基因、结构校验、修复和失败原因。

**Non-Goals:**

- 不新增 HTTP API。
- 不新增数据库表，不修改 `docs/sql`。
- 不修改 `docs/api`。
- 不让 Agent 自动确认、编辑、归档或合并基因经验。
- 不实现数据回流快照读取 Tool；当前尚无数据回流模块可接入。
- 不实现营养库读取 Tool；营养库读取保留占位，等待营养库模块完成后补充。
- 不实现复杂适应度评分、自动谱系优化或遗传算法。
- 不自动改写生成器或枝化生长策略。

## Decisions

### Decision 1: 基因汲取 Skill 作为内置系统 Skill 注册

基因汲取是内容森林自己的系统能力，负责把证据解释成可确认的基因建议。它需要理解内容森林的证据、正/反向基因、谱系和生态位语义，因此应作为内置 Skill 随后端代码发布，并在应用装配时注册到 SkillRegistry。

不采用外部 Skill 的原因是基因汲取不应由用户上传方法论替换核心边界。外部生成器 Skill 负责内容创作，而基因汲取 Skill 负责系统进化经验沉淀，两者职责不同。

### Decision 2: 基因汲取使用专用证据读取 Tool

本次新增基因汲取专用只读 Tool，而不是复用枝化生长读取 Tool。建议的最小 Tool 集合：

- `read_gene_seed_context`：读取本次任务所属种子的标题和 Markdown 正文。
- `read_gene_evidence`：读取证据来源相关上下文，第一版支持果实选择、果实淘汰和发布记录。
- `read_referable_gene_insights`：读取同一种子下可引用的既有基因经验正文。

这样可以让 Skill 基于证据语义组织分析，而不是把证据读取混入枝化生长的 `sourceNodeRef` 模型中。

### Decision 3: 营养库读取先占位，不阻塞基因汲取 Skill

枝化生长确实需要读取营养库和基因库。当前基因库读取已经由枝化生长资源 Tool 支持；营养库读取目前仍是占位，因为营养库模块正在并行开发。本变更不实现营养库读取，只在设计中保留后续接入点。

该选择避免基因汲取 Skill 依赖尚未完成的营养库领域，也避免在 Agent 层凭空定义营养库存储端口。

### Decision 4: 正向/反向基因先进入 Agent 结构化建议，再格式化进入现有建议正文

用户确认需要引入正向基因和反向基因概念。但当前基因汲取领域已实现的 `GeneSuggestion` 和 `GeneInsight` 持久化模型没有独立 `polarity` 字段。为避免本次 Agent Skill 变更扩大到 API/SQL 修改，第一版在 Agent 内部结构化输出中要求包含：

- `polarity`: `positive` 或 `negative`
- `similarityRelation`: `new`、`reinforces`、`branches` 或 `conflicts`

Skill 在返回给现有 GeneService 前，将这些结构化信息写入 `bodyMarkdown` 和 `evidenceInterpretation`。这样可以让用户在确认建议时看到明确的正/反向判断，同时不改变数据库和 API 契约。

后续如果前端需要按正/反向筛选、统计或结构化引用，可单独发起领域变更，把 `polarity` 和相似关系提升为数据库维护的 meta 字段。

### Decision 5: 单次汲取返回 1 到 3 条建议

基因汲取是高频动作，单次输出过多会污染基因库，也会增加用户确认负担。因此 Skill 必须限制最终建议数量为 1 到 3 条。若模型输出超过 3 条，结构化校验应失败并进入修复，要求保留最有价值的 1 到 3 条。

### Decision 6: 相似基因只提示，不自动合并

Skill 可以读取既有基因经验并判断新建议与它们的关系：新增、强化、分叉或冲突。但 Skill 不自动合并、不修改既有经验、不删除重复建议。相似关系作为提示交给用户，由用户编辑、确认或放弃。

该设计保持“Agent 只生成建议，用户确认沉淀”的边界。

### Decision 7: 发布记录可作为证据，反馈快照暂不接入

发布验证模块已经完成，具备发布记录存储端口。基因汲取 Tool 可以读取发布记录作为外部验证事实，包括发布目标、发布凭证、备注和发布时间。但发布记录只能说明“内容被发布验证”，不能说明表现优劣。

数据回流/监控器/快照模块尚未落地，因此本变更不实现反馈快照 Tool。后续数据回流模块完成后，再将反馈快照接入为中/强证据。

### Decision 8: 输出采用本地 Schema 校验与有限修复

基因汲取 Skill 成功输出必须能归一化为 `suggestions` 数组，并最终适配现有 GeneService 可消费的建议结构。结构化校验重点包括：

- 建议数量必须为 1 到 3 条。
- 每条建议必须有非空标题和正文。
- 每条建议必须有正向或反向语义。
- 每条建议必须说明证据依据。
- 输出不得声明已写入基因库、已确认基因经验或已修改系统事实。
- 输出不得包含真实本地绝对路径。

校验失败时进入有限修复流程，把错误反馈给模型并要求只修复结构，不重新执行系统事实落地。

## Risks / Trade-offs

- [Risk] 正/反向基因没有独立数据库字段，后续筛选能力不足 → Mitigation：第一版写入正文和证据解释，后续需要结构化筛选时单独扩展 Gene 领域 API/SQL。
- [Risk] 只基于选择/淘汰会有主观偏差 → Mitigation：保留证据强度，弱证据只生成待确认建议，不自动沉淀。
- [Risk] 发布记录不代表表现数据 → Mitigation：发布证据只作为发布验证上下文，不推断真实效果；表现数据等待数据回流模块。
- [Risk] 既有基因经验过多导致上下文膨胀 → Mitigation：Tool 可按任务输入中的 `referableGeneInsights` 读取，后续再增加排序、摘要或检索。
- [Risk] LLM 输出结构不稳定 → Mitigation：本地 Schema 校验、修复重试和 Trace 记录。
- [Risk] 营养库 Tool 缺失影响枝化生长完整性 → Mitigation：本变更不处理营养库，保留占位并等待营养库模块接入。

## Migration Plan

本变更新增 Agent 能力，不迁移已有数据。上线时注册新 Skill 和新 Tool 即可。若需要回滚，移除基因汲取 Skill 与相关 Tool 注册，GeneService 仍可使用测试替身或外部 AgentPort，不影响已保存的基因库、建议和经验。

## Open Questions

- 是否在后续领域变更中把 `polarity` 提升为 GeneSuggestion/GeneInsight 的数据库 meta 字段。
- 数据回流模块完成后，反馈快照的证据强度和正/反向判断规则如何映射。
- 既有基因经验数量变大后，是否需要增加基因经验摘要或检索 Tool。
