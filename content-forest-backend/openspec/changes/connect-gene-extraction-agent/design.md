## Context

当前后端已经完成三块能力：`add-gene-extraction-module` 提供基因库、汲取提醒、汲取任务、基因建议和基因经验落地；`add-gene-extraction-agent-skill` 提供内置 `gene_extraction` Skill、只读 Tool 和结构化输出校验；应用装配中也已经注册基因汲取 Skill 与相关 Tool。

当前剩余问题不在 Agent 是否会生成建议，而在领域侧是否足够稳健地把真实业务证据交给 Agent。现有 `GeneService.startExtractionTask` 已能组装果实证据和既有可引用基因经验，但对发布记录、反馈证据、第三方 AgentPort 异常输出和 Agent 输入演进缺少明确边界。

本设计遵守 `docs/design/内容森林架构设计文档.md`、`docs/design/内容森林Agent架构设计文档.md`、`docs/design/基因汲取Agent对接契约.md` 和基因汲取领域设计：系统事实由数据库维护，Markdown 只保存正文，Agent 只生成建议，基因领域服务负责校验、状态流转和持久化。

## Goals / Non-Goals

**Goals:**

- 让基因汲取领域与真实 Agent Runtime 对接更稳健，而不是只依赖测试替身。
- 在发起 Agent 任务前校验证据来源是否属于当前种子或当前种子内容树。
- 支持发布记录作为基因汲取证据，但不把发布记录解释成表现好坏。
- 明确纯反馈证据在数据回流模块完成前不可作为可执行汲取证据。
- 为 `gene_extraction` Agent 输入增加轻量契约版本信息。
- 在 AgentPort 返回成功但输出结构不可消费时，将汲取任务标记为失败。
- 保持现有 API/SQL 契约不变。

**Non-Goals:**

- 不新增 HTTP API。
- 不新增数据库表，不修改 `docs/sql/gene.sql`。
- 不修改 `docs/api/gene.yaml`。
- 不把 `polarity`、`similarityRelation` 或 `relatedInsightIds` 提升为数据库 meta。
- 不修改基因汲取 Agent Skill 的 Prompt、Tool 或结构化输出 Schema。
- 不实现数据回流快照 Tool 或反馈数据自动分析。
- 不引入通用任务系统、队列或后台 Worker。

## Decisions

### Decision 1: 证据授权在 GeneService 发起任务前完成

`GeneService` 应在创建 Agent 输入前校验所有证据来源。果实选择/淘汰证据必须能追溯到当前种子内容树；发布记录证据必须对应某个果实，并且该果实也必须属于当前种子内容树。反馈证据在数据回流模块完成前不允许作为唯一可执行证据。

选择该方案的原因是 Tool 的授权边界依赖任务输入；如果领域服务把不该访问的证据放进任务输入，Agent Tool 只能在更晚阶段发现问题。领域侧先校验可以更早返回用户可理解错误，也能避免越权上下文进入 Agent 授权范围。

备选方案是只依赖 Tool 校验。该方案实现更少，但错误发生在 Agent 执行期间，任务状态、失败原因和用户反馈都更绕。

### Decision 2: 发布记录是中性证据，不代表效果

发布记录可作为 `publication` 证据进入 Agent 输入，但它只说明某个果实被发布验证过，包含发布目标、发布凭证、备注和发布时间。领域侧和 Agent 侧都不得据此推断内容表现好坏。

选择该方案是因为发布验证模块已经可用，而数据回流模块尚未完成。发布记录能说明“已进入外部验证”，但不能替代点击、点赞、转化等反馈数据。

### Decision 3: 纯反馈证据暂时拒绝或失败，不伪造上下文

当前基因领域类型已经预留 `feedback` 证据类型，Agent Tool 也能返回暂不支持信息。但在领域对接层，如果一次任务所有证据都是尚未接入的反馈证据，应拒绝创建可执行任务，或将任务明确标记失败，而不是让 Agent 基于空证据生成建议。

混合证据中包含 feedback 时，可保留该证据作为未支持上下文提示，但必须至少有一项当前可执行证据，例如果实选择、果实淘汰或发布记录。

### Decision 4: Agent 输入增加契约版本

`gene_extraction` 任务 input 应携带轻量契约版本，例如 `contractVersion`。第一期版本只表达当前输入结构，不引入兼容层。Agent Skill 可忽略未知字段，但测试应固定版本，避免后续输入字段演进时没有显式意识。

备选方案是不增加版本字段。该方案短期更简单，但 Agent 输入既被领域服务构建、又被 Tool 和 Skill 消费，后续一旦演进容易出现隐形不兼容。

### Decision 5: GeneService 必须兜底校验 Agent 成功输出

内置 Agent Runtime 已有基因输出 Schema 校验，但领域服务不能假设所有 AgentPort 实现都同样可靠。若未来替换为第三方 AgentPort，可能返回 `ok: true` 但内容缺少 `suggestions`、标题或正文。`GeneService` 在归一化输出失败时必须把汲取任务标记为失败，并返回用户可理解错误。

这延续“Agent 输出只是建议，后端应用服务负责落地前校验”的架构边界。

### Decision 6: 正/反向基因仍暂存于 Markdown 正文

本次连接层不修改 GeneSuggestion/GeneInsight 的数据库 meta。Agent 产生的正向/反向语义和相似关系继续写入 `bodyMarkdown` 与 `evidenceInterpretation`，由用户确认时作为正文的一部分沉淀。

如果后续前端需要按正向/反向筛选、统计或引用策略控制，应单独发起 Gene 领域变更，更新 `docs/api/gene.yaml` 和 `docs/sql/gene.sql`。

## Risks / Trade-offs

- [Risk] 内容树归属校验需要沿果实父链查找根种子，可能增加存储读取次数 → Mitigation：第一期内容树较轻，先使用简单递归读取；后续工作区模块若提供树索引再替换。
- [Risk] 发布记录证据只有验证行为，没有表现数据 → Mitigation：明确将其作为中性证据，并在 Agent 输入中保留解释边界。
- [Risk] 拒绝纯 feedback 证据会让预留类型暂时不可用 → Mitigation：这是避免伪造数据的代价，待数据回流模块完成后再放开。
- [Risk] 契约版本字段本身不能解决所有兼容问题 → Mitigation：将版本写入测试和对接文档，作为后续变更提醒点。
- [Risk] 第三方 AgentPort 输出异常可能在任务已创建后失败 → Mitigation：任务明确转为 failed，保留失败原因，用户可重试。

## Migration Plan

本变更不迁移已有数据，不新增表，不修改接口契约。上线时只调整基因领域服务对 Agent 输入、证据授权和输出失败的处理。若需要回滚，可恢复原有 `GeneService.startExtractionTask` 的输入构建和输出解析逻辑；已存在的基因库、建议和经验不受影响。

## Open Questions

- 数据回流模块完成后，`feedback` 证据是否应由领域侧直接校验归属，还是通过数据回流领域提供专用授权端口。
- `publication` 证据的强度是否应固定为 `medium`，还是继续尊重调用方传入的 strength。
- 后续是否需要将 `polarity` 提升为 GeneSuggestion/GeneInsight 的结构化 meta 字段。
