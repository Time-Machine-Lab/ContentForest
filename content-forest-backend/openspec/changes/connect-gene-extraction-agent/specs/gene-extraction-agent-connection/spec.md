## ADDED Requirements

### Requirement: 校验基因汲取证据归属
系统 SHALL 在发起基因汲取 Agent 任务前校验证据来源归属。果实选择、果实淘汰和发布记录证据 MUST 归属于当前种子或当前种子内容树，未归属的证据 MUST 被拒绝。

#### Scenario: 接受当前种子下的果实证据
- **WHEN** 用户基于当前种子内容树中的果实选择或果实淘汰证据发起基因汲取
- **THEN** 系统 MUST 允许该证据进入 Agent 输入
- **AND** 系统 MUST 在 Agent 输入中包含该果实的 meta 和内容位置

#### Scenario: 拒绝其他种子的果实证据
- **WHEN** 用户在某个种子下发起基因汲取但提供其他种子的果实证据
- **THEN** 系统 MUST 拒绝创建可执行汲取任务
- **AND** 系统 MUST 返回用户可理解的证据越权错误

#### Scenario: 接受归属当前种子的发布记录证据
- **WHEN** 用户提供发布记录作为基因汲取证据
- **THEN** 系统 MUST 校验该发布记录对应果实归属于当前种子内容树
- **AND** 校验通过后系统 MUST 允许该发布记录进入 Agent 输入

### Requirement: 明确支持的证据类型策略
系统 SHALL 明确第一期可执行基因汲取证据类型。果实选择、果实淘汰和发布记录 MUST 可作为可执行证据；反馈证据在数据回流模块完成前 MUST NOT 被伪造成可执行表现数据。

#### Scenario: 基于果实和发布证据执行汲取
- **WHEN** 用户提供果实选择、果实淘汰或发布记录证据
- **THEN** 系统 MUST 能基于这些证据创建基因汲取任务
- **AND** 系统 MUST 调用 AgentPort 执行 `gene_extraction` 任务

#### Scenario: 拒绝纯反馈证据
- **WHEN** 用户只提供 feedback 类型证据发起基因汲取
- **THEN** 系统 MUST 拒绝创建可执行汲取任务或将任务标记为失败
- **AND** 系统 MUST 明确说明反馈证据尚未接入

#### Scenario: 混合证据包含未支持反馈
- **WHEN** 用户提供至少一项可执行证据并混入 feedback 类型证据
- **THEN** 系统 MUST 允许可执行证据进入 Agent 输入
- **AND** 系统 MUST 不伪造 feedback 表现数据

### Requirement: 版本化基因汲取 Agent 输入
系统 SHALL 为 `gene_extraction` Agent 输入提供轻量契约版本信息。契约版本 MUST 随任务输入传给 AgentPort，并 MUST 被测试固定以支撑后续输入结构演进。

#### Scenario: Agent 输入包含契约版本
- **WHEN** 基因领域服务构建 `gene_extraction` Agent 输入
- **THEN** 输入 MUST 包含当前基因汲取输入契约版本
- **AND** 输入 MUST 保留 seedId、taskId、evidenceSources、fruitEvidence 和 referableGeneInsights

#### Scenario: 后续输入结构演进
- **WHEN** 开发者修改基因汲取 Agent 输入结构
- **THEN** 系统 MUST 显式评估契约版本是否需要升级
- **AND** 相关测试 MUST 能暴露未同步的输入契约变化

### Requirement: 兜底校验 Agent 成功输出
系统 SHALL 在基因领域服务中兜底校验 Agent 成功输出。即使 AgentPort 返回 `ok = true`，如果输出无法归一化为可持久化基因建议，系统 MUST 将汲取任务标记为失败。

#### Scenario: Agent 成功输出可消费建议
- **WHEN** AgentPort 返回 `ok = true` 且输出包含可消费 suggestions
- **THEN** 系统 MUST 将 suggestions 持久化为待确认基因建议
- **AND** 系统 MUST 将汲取任务标记为已完成

#### Scenario: Agent 成功输出结构不可消费
- **WHEN** AgentPort 返回 `ok = true` 但输出缺少可用 suggestions、标题或正文
- **THEN** 系统 MUST 将汲取任务标记为失败
- **AND** 系统 MUST 返回用户可理解的 Agent 输出不可用原因

#### Scenario: Agent 失败输出
- **WHEN** AgentPort 返回 `ok = false`
- **THEN** 系统 MUST 将汲取任务标记为失败
- **AND** 系统 MUST 保留 Agent 返回的失败原因

### Requirement: 保持基因正反向语义非数据库化
系统 SHALL 在本变更中保持正向基因、反向基因和相似关系为建议正文内容，不得新增数据库 meta 或 API 字段承载这些信息。

#### Scenario: 保存包含正反向语义的建议
- **WHEN** Agent 输出包含正向基因、反向基因或相似关系信息
- **THEN** 系统 MUST 将这些信息作为待确认建议正文或证据解释的一部分保存
- **AND** 系统 MUST NOT 新增数据库字段保存这些 meta

#### Scenario: 用户确认建议
- **WHEN** 用户确认包含正反向语义的基因建议
- **THEN** 系统 MUST 将正文写入正式基因经验 Markdown
- **AND** 系统 MUST 继续由数据库维护既有的归属、证据、谱系、生态位、状态和内容位置

### Requirement: 保持顶层 API 与 SQL 契约不变
系统 SHALL 不因本次连接层增强新增或修改基因汲取 HTTP API 与数据库表结构。若实现发现必须新增接口或字段，系统 MUST 暂停当前变更并另开领域契约变更。

#### Scenario: 实现连接层增强
- **WHEN** 开发者实现本变更
- **THEN** 系统 MUST 不修改 `docs/api/gene.yaml`
- **AND** 系统 MUST 不修改 `docs/sql/gene.sql`

#### Scenario: 发现需要新字段
- **WHEN** 实现过程中发现必须新增结构化字段或接口
- **THEN** 系统 MUST 暂停本变更范围
- **AND** 系统 MUST 通过新的 OpenSpec 变更更新 API 或 SQL 契约
