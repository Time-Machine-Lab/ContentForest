# nutrient-research-session-management Specification

## Purpose
TBD - created by archiving change decouple-nutrient-session-and-card-backend. Update Purpose after archive.
## Requirements
### Requirement: 管理独立营养研究会话
后端 SHALL 提供独立的种子级营养研究会话能力。研究会话 MUST 只归属于种子，MUST NOT 绑定营养内容、营养卡片或其他资料资产。该能力的 API 契约 MUST 定义在 `docs/api/nutrient.yaml` 的 Nutrient Controller 下，存储结构 MUST 定义在 `docs/sql/nutrient.sql` 的 `nutrient_research_sessions`、`nutrient_research_messages` 和 `nutrient_depositable_blocks` 表中。

#### Scenario: 创建独立研究会话
- **WHEN** 客户端为某个种子创建营养研究会话
- **THEN** 后端 MUST 创建只归属于该种子的研究会话
- **AND** 后端 MUST NOT 要求或保存营养内容标识
- **AND** 后端 MUST 返回会话详情、消息列表和可沉淀营养块列表

#### Scenario: 查询种子的研究会话列表
- **WHEN** 客户端查询某个种子的营养研究会话列表
- **THEN** 后端 MUST 返回该种子下的全部研究会话摘要
- **AND** 返回结果 MUST NOT 以营养内容或营养卡片作为筛选前提
- **AND** 返回结果 MUST NOT 暴露会话与营养内容绑定关系

#### Scenario: 提交会话消息
- **WHEN** 客户端向独立研究会话提交普通或流式研究消息
- **THEN** 后端 MUST 将用户消息、Agent 回复和可沉淀营养块追加到该会话
- **AND** 后端 MUST NOT 因该会话自动创建、编辑、归档或绑定任何营养内容

### Requirement: 删除营养研究会话
后端 SHALL 支持删除营养研究会话。删除会话 MUST 只删除研究过程数据，包括会话、消息和未沉淀的可沉淀营养块；MUST NOT 删除或修改已经创建的草稿、已沉淀或已归档营养内容。

#### Scenario: 删除空闲研究会话
- **WHEN** 客户端请求删除某个未运行中的营养研究会话
- **THEN** 后端 MUST 删除该会话的会话记录
- **AND** 后端 MUST 删除该会话下的研究消息
- **AND** 后端 MUST 删除该会话下尚未保存为营养内容的可沉淀营养块
- **AND** 后端 MUST NOT 影响任何营养内容系统事实或 Markdown 内容本体

#### Scenario: 拒绝删除运行中会话
- **WHEN** 客户端请求删除正在流式输出或正在执行 Agent 研究的会话
- **THEN** 后端 MUST 拒绝删除请求并返回可理解的业务错误
- **AND** 后端 MUST 保留该会话当前已保存的消息和可沉淀块

#### Scenario: 删除不存在的会话
- **WHEN** 客户端请求删除不存在的营养研究会话
- **THEN** 后端 MUST 返回未找到错误
- **AND** 后端 MUST NOT 修改任何营养内容或其他研究会话

### Requirement: 可沉淀营养块必须显式选择去向
后端 SHALL 将可沉淀营养块视为会话过程中的候选结果。候选结果保存为营养内容或合并到营养内容时，客户端 MUST 显式选择操作类型和目标，后端 MUST NOT 根据会话绑定、当前选中内容或隐式上下文推断目标。

#### Scenario: 保存为新草稿营养内容
- **WHEN** 客户端请求将某个可沉淀营养块保存为新营养内容
- **THEN** 后端 MUST 在当前种子下创建草稿态工作台营养内容
- **AND** 后端 MUST 保留原研究会话和可沉淀块事实
- **AND** 后端 MUST NOT 把新草稿反向绑定到该研究会话

#### Scenario: 合并到显式目标营养内容
- **WHEN** 客户端请求将某个可沉淀营养块合并到既有营养内容
- **THEN** 请求 MUST 提供目标营养内容标识
- **AND** 后端 MUST 校验目标营养内容属于同一种子且未归档
- **AND** 后端 MUST 将候选内容合并到目标营养内容
- **AND** 后端 MUST 记录合并来源和目标，便于后续追踪资料迭代

#### Scenario: 拒绝缺少目标的合并
- **WHEN** 客户端请求合并可沉淀营养块但未提供目标营养内容
- **THEN** 后端 MUST 拒绝请求并返回校验错误
- **AND** 后端 MUST NOT 修改任何营养内容

