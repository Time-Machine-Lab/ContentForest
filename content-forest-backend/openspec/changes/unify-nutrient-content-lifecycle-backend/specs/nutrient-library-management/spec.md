## ADDED Requirements

### Requirement: 统一营养内容工作台生命周期语言
后端 SHALL 将种子营养工作台中的草稿、沉淀和归档资料统一视为营养内容的生命周期形态。`nutrient_cards` 可以作为内部系统事实承载，但顶层文档、API 描述和业务错误信息 MUST 避免把“营养卡片”表达为独立于营养内容之外的新领域对象。

#### Scenario: 返回工作台营养内容
- **WHEN** 客户端查询某个种子下的工作台营养内容列表
- **THEN** 后端 MUST 返回草稿、已沉淀和已归档三类状态对应的数据
- **AND** 内部状态值 `unsettled` MUST 表达为草稿语义
- **AND** 内部状态值 `settled` MUST 表达为已沉淀语义
- **AND** 内部状态值 `archived` MUST 表达为已归档语义

#### Scenario: 更新顶层文档语言
- **WHEN** 开发者开始实现营养内容生命周期统一
- **THEN** `docs/design/domain/营养库领域模块设计文档.md` MUST 说明营养内容是用户侧唯一资料概念
- **AND** `docs/sql/nutrient.sql` MUST 说明 `nutrient_cards` 是营养内容在工作台中的生命周期承载表
- **AND** `docs/api/nutrient.yaml` MUST 使用草稿、沉淀、归档和默认带入语义描述相关接口

### Requirement: 确保默认种子专属营养库
后端 SHALL 提供幂等能力，确保指定种子存在一个可用于营养工作台沉淀的默认种子专属营养库。该能力 MUST 归属于 `docs/api/nutrient.yaml` 的 Nutrient Controller 契约，并 MUST 使用 `docs/sql/nutrient.sql` 中的 `nutrient_libraries` 表维护系统事实。

#### Scenario: 种子没有默认专属营养库
- **WHEN** 客户端请求确保某个种子的默认专属营养库
- **THEN** 后端 MUST 创建一个归属于该种子的未归档种子专属营养库
- **AND** 后端 MUST 返回该营养库详情
- **AND** 新营养库 MUST 可作为草稿营养内容沉淀目标

#### Scenario: 种子已有可用默认专属营养库
- **WHEN** 客户端重复请求确保同一种子的默认专属营养库
- **THEN** 后端 MUST 返回已存在的默认专属营养库
- **AND** 后端 MUST NOT 创建重复默认库

### Requirement: 沉淀草稿营养内容时自动选择默认库
后端 SHALL 支持将草稿态工作台营养内容沉淀为当前种子的正式营养内容。沉淀请求提供目标库时 MUST 校验目标库属于当前种子且未归档；沉淀请求未提供目标库时 MUST 自动确保并使用当前种子的默认专属营养库。

#### Scenario: 指定目标库沉淀草稿
- **WHEN** 客户端提交草稿营养内容沉淀请求并携带目标库
- **THEN** 后端 MUST 校验目标库为当前种子的未归档种子专属营养库
- **AND** 后端 MUST 创建正式营养内容并关联草稿的沉淀结果
- **AND** 后端 MUST 将草稿状态更新为已沉淀

#### Scenario: 未指定目标库沉淀草稿
- **WHEN** 客户端提交草稿营养内容沉淀请求但未携带目标库
- **THEN** 后端 MUST 确保当前种子的默认专属营养库存在
- **AND** 后端 MUST 将草稿沉淀到该默认专属营养库
- **AND** 后端 MUST 返回已沉淀的工作台营养内容详情

### Requirement: 删除草稿态营养内容
后端 SHALL 允许删除草稿态工作台营养内容。删除 MUST 只允许作用于草稿态；已沉淀和已归档营养内容 MUST NOT 被硬删除。

#### Scenario: 删除草稿营养内容
- **WHEN** 客户端请求删除草稿态营养内容
- **THEN** 后端 MUST 删除该草稿的系统事实
- **AND** 后端 MUST 尽力清理该草稿对应的 Markdown 内容本体
- **AND** 后端 MUST NOT 影响已经沉淀的正式营养内容

#### Scenario: 拒绝删除非草稿营养内容
- **WHEN** 客户端请求删除已沉淀或已归档营养内容
- **THEN** 后端 MUST 拒绝请求并返回业务错误
- **AND** 后端 MUST 保留该营养内容的系统事实和 Markdown 内容本体

### Requirement: 默认带入营养内容
后端 SHALL 支持将已沉淀营养内容标记为枝化生长的默认带入资料。默认带入标记 MUST 只影响可引用营养查询结果，不得使后端在枝化生长中强制引用该内容。

#### Scenario: 设置默认带入
- **WHEN** 客户端请求将已沉淀营养内容设置为默认带入
- **THEN** 后端 MUST 校验该内容处于已沉淀状态
- **AND** 后端 MUST 更新默认带入系统事实
- **AND** 后端 MUST 在可引用营养查询结果中返回该标记

#### Scenario: 草稿或归档内容不能设置默认带入
- **WHEN** 客户端请求将草稿或已归档营养内容设置为默认带入
- **THEN** 后端 MUST 拒绝请求并返回业务错误
- **AND** 后端 MUST NOT 修改默认带入标记
