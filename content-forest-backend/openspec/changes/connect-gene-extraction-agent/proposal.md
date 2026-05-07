## Why

基因汲取领域模块和内置基因汲取 Agent Skill 都已完成，但二者之间仍缺少生产级对接约束：领域侧需要更严格地授权证据、版本化 Agent 输入、兜底处理第三方 AgentPort 的异常输出，并明确暂未接入反馈证据时的业务策略。

现在补齐这层连接，可以让“汲取任务 → Agent 建议 → 待确认建议”在真实 Agent Runtime 下更稳定，也为后续替换外部 AgentPort、接入数据回流证据保留清晰边界。

## What Changes

- 增强 `GeneService` 发起基因汲取任务前的证据授权校验，确保果实证据、发布记录证据都归属于当前种子或当前种子内容树。
- 为 `gene_extraction` Agent 输入增加轻量契约版本信息，避免后续输入结构演进时悄悄破坏 Agent 侧兼容性。
- 明确第一期支持的证据类型策略：果实选择、果实淘汰、发布记录可进入真实 Agent 汲取；纯反馈证据在数据回流模块完成前不得被伪造成可用证据。
- 增强 `GeneService` 对 Agent 输出的兜底校验：即使未来替换为第三方 AgentPort，返回 `ok: true` 但结构不可消费时，也必须将汲取任务标记为失败。
- 保持正向/反向基因和相似关系暂不进入数据库 meta，继续由 Agent 写入建议正文和证据解释，避免扩大 API/SQL 范围。
- 补充领域侧与真实 Agent Runtime 的集成测试，覆盖授权输入、发布证据、不可支持反馈证据、结构异常输出和失败任务状态。
- 不新增 HTTP API，不新增数据库表，不修改 `docs/api` 或 `docs/sql` 顶层契约。

## Capabilities

### New Capabilities

- `gene-extraction-agent-connection`: 覆盖基因汲取领域与真实 Agent Runtime 的输入授权、输入契约版本、输出兜底校验、证据类型策略和任务失败处理。

### Modified Capabilities

无。

## Impact

- 后端基因领域：调整 `GeneService.startExtractionTask` 的证据授权、Agent 输入构建和 Agent 输出异常处理。
- 后端存储读取：可能通过现有 `FruitStoragePort`、`PublicationStoragePort`、`GeneStoragePort` 和 `SeedStoragePort` 读取系统事实用于授权校验，不新增表。
- Agent 对接边界：继续使用 `AgentPort.runTask(type = "gene_extraction")`，不新增专用 AgentPort 方法。
- 顶层契约：不修改 `docs/api/gene.yaml`、`docs/sql/gene.sql`；如实现发现必须新增结构化字段，应暂停并另开领域变更。
- 测试：新增基因领域与真实 Agent Runtime 对接测试，补齐异常 AgentPort 输出和未支持证据策略测试。
