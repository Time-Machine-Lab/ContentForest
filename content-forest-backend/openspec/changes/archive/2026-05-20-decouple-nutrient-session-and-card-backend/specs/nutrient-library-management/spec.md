## MODIFIED Requirements

### Requirement: 统一营养内容工作台生命周期语言
后端 SHALL 将种子营养工作台中的草稿、沉淀和归档资料统一视为营养内容的生命周期形态。`nutrient_cards` 可以作为内部系统事实承载，但顶层文档、API 描述和业务错误信息 MUST 避免把“营养卡片”表达为独立于营养内容之外的新领域对象。营养内容 SHALL 独立于营养研究会话；营养内容详情、列表和生命周期操作 MUST NOT 依赖或暴露会话绑定关系。

#### Scenario: 返回工作台营养内容
- **WHEN** 客户端查询某个种子下的工作台营养内容列表
- **THEN** 后端 MUST 返回草稿、已沉淀和已归档三类状态对应的数据
- **AND** 内部状态值 `unsettled` MUST 表达为草稿语义
- **AND** 内部状态值 `settled` MUST 表达为已沉淀语义
- **AND** 内部状态值 `archived` MUST 表达为已归档语义
- **AND** 返回结果 MUST NOT 包含营养研究会话标识

#### Scenario: 更新顶层文档语言
- **WHEN** 开发者开始实现营养内容生命周期统一
- **THEN** `docs/design/domain/营养库领域模块设计文档.md` MUST 说明营养内容是用户侧唯一资料概念
- **AND** `docs/design/domain/营养库领域模块设计文档.md` MUST 说明营养研究会话是独立研究过程，不属于营养内容身份
- **AND** `docs/sql/nutrient.sql` MUST 说明 `nutrient_cards` 是营养内容在工作台中的生命周期承载表
- **AND** `docs/api/nutrient.yaml` MUST 使用草稿、沉淀、归档和默认带入语义描述相关接口

### Requirement: 维护种子级营养卡片生命周期
系统 SHALL 支持当前种子下工作台营养内容的草稿、已沉淀、已归档状态。草稿内容表示仍在研究或整理中；已沉淀内容表示已经写入当前种子专属营养库；已归档内容表示保留历史但不可引用。工作台营养内容 MUST NOT 绑定营养研究会话；Agent 研究产出的可沉淀营养块只有在用户显式保存或合并时才进入营养内容生命周期。

#### Scenario: 创建草稿营养内容
- **WHEN** 用户采纳营养汲取建议或从 Agent 可沉淀营养块保存新内容
- **THEN** 系统 MUST 在当前种子下创建草稿营养内容
- **AND** 系统 MUST NOT 将该内容写入公共营养库
- **AND** 系统 MUST NOT 将该内容绑定到研究会话

#### Scenario: 沉淀营养内容
- **WHEN** 用户将草稿营养内容确认为已沉淀
- **THEN** 系统 MUST 将该内容保存为当前种子专属营养库中的正式营养内容
- **AND** 系统 MUST 保留工作台内容与正式营养内容的关联
- **AND** 系统 MUST NOT 创建或修改任何研究会话

#### Scenario: 归档营养内容
- **WHEN** 用户归档工作台营养内容
- **THEN** 系统 MUST 将该内容标记为已归档
- **AND** 已归档内容 MUST NOT 出现在可引用营养范围中
- **AND** 系统 MUST NOT 影响任何研究会话

## REMOVED Requirements

### Requirement: 绑定营养卡片会话
**Reason**: 营养内容是可引用资料资产，研究会话是 Agent 研究过程。二者绑定会造成点击语义、删除范围和合并目标歧义。

**Migration**: 新实现中营养内容不再维护会话标识；研究会话只按种子查询和管理。旧 `conversationId` 或卡片会话绑定字段必须从 API 响应中移除，存储层可以在迁移阶段忽略旧值。
