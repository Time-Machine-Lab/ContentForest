## ADDED Requirements

### Requirement: 补齐数据回流顶层契约
系统 SHALL 为数据回流模块提供顶层 API 与 SQL 契约。API 契约 MUST 落到 `docs/api/feedback.yaml`，并对应单一 Feedback Controller；存储契约 MUST 落到 `docs/sql/feedback.sql`，并描述监控器挂载与反馈快照的系统事实结构。

#### Scenario: 提供反馈 API 契约
- **WHEN** 开发数据回流 HTTP Controller
- **THEN** 系统 MUST 存在 `docs/api/feedback.yaml`
- **AND** 该契约 MUST 覆盖监控器挂载、反馈快照创建、反馈快照编辑和发布记录反馈历史查询

#### Scenario: 提供反馈 SQL 契约
- **WHEN** 开发数据回流 SQLite 存储适配器
- **THEN** 系统 MUST 存在 `docs/sql/feedback.sql`
- **AND** 该契约 MUST 描述发布记录与监控器挂载、反馈快照之间的持久化关系

### Requirement: 为发布记录挂载人为监控器
系统 SHALL 支持为已存在的发布记录挂载人为监控器。挂载前，系统 MUST 校验发布记录存在；同一发布记录 MUST NOT 同时挂载多个监控器。

#### Scenario: 成功挂载人为监控器
- **WHEN** 用户为一条存在的发布记录请求挂载人为监控器
- **THEN** 系统 MUST 创建监控器挂载记录
- **AND** 该挂载 MUST 关联到该发布记录
- **AND** 该挂载 MUST 使用人为监控器语义

#### Scenario: 发布记录不存在时拒绝挂载
- **WHEN** 用户为不存在的发布记录请求挂载监控器
- **THEN** 系统 MUST 拒绝创建监控器挂载
- **AND** 系统 MUST 返回发布记录不存在的错误

#### Scenario: 重复挂载监控器时拒绝
- **WHEN** 一条发布记录已经存在监控器挂载
- **AND** 用户再次为该发布记录请求挂载监控器
- **THEN** 系统 MUST 拒绝重复挂载
- **AND** 系统 MUST 保持原有监控器挂载不变

### Requirement: 创建反馈快照
系统 SHALL 支持基于已挂载监控器的发布记录创建反馈快照。反馈快照 MUST 通过监控器创建，MUST 保存自由结构的表现数据和用户观察，且 MUST 关联到明确的发布记录。

#### Scenario: 成功创建反馈快照
- **WHEN** 用户为已挂载人为监控器的发布记录提交表现数据和用户观察
- **THEN** 系统 MUST 创建一条反馈快照
- **AND** 该快照 MUST 关联到该发布记录
- **AND** 该快照 MUST 保留用户提交的表现数据和用户观察

#### Scenario: 未挂载监控器时拒绝创建快照
- **WHEN** 用户为未挂载监控器的发布记录提交反馈快照
- **THEN** 系统 MUST 拒绝创建反馈快照
- **AND** 系统 MUST 提示需要先挂载监控器

#### Scenario: 同一发布记录支持多次快照
- **WHEN** 用户为同一发布记录多次提交反馈快照
- **THEN** 系统 MUST 保留每一次快照
- **AND** 系统 MUST 按创建时间形成该发布记录的反馈历史

### Requirement: 编辑反馈快照
系统 SHALL 支持编辑已有反馈快照的表现数据和用户观察。系统 MUST NOT 允许通过编辑改变快照关联的发布记录、监控器挂载或创建时间。

#### Scenario: 成功编辑反馈快照
- **WHEN** 用户编辑一条存在的反馈快照
- **THEN** 系统 MUST 保存编辑后的表现数据或用户观察
- **AND** 系统 MUST 保持该快照关联的发布记录不变
- **AND** 系统 MUST 保持该快照的创建时间不变

#### Scenario: 快照不存在时拒绝编辑
- **WHEN** 用户编辑不存在的反馈快照
- **THEN** 系统 MUST 返回快照不存在的错误

### Requirement: 查询发布记录反馈历史
系统 SHALL 支持按发布记录查询反馈上下文。查询结果 MUST 包含该发布记录的监控器挂载状态和全部反馈快照。

#### Scenario: 查询存在反馈历史的发布记录
- **WHEN** 用户查询一条已有反馈快照的发布记录反馈历史
- **THEN** 系统 MUST 返回该发布记录的监控器挂载信息
- **AND** 系统 MUST 返回该发布记录下的全部反馈快照

#### Scenario: 查询尚无快照的发布记录
- **WHEN** 用户查询一条已挂载监控器但尚无反馈快照的发布记录
- **THEN** 系统 MUST 返回监控器挂载信息
- **AND** 系统 MUST 返回空的反馈快照列表

### Requirement: 禁止删除反馈快照
系统 SHALL 不提供反馈快照删除能力。反馈快照是数据回流历史的一部分，用户需要修正错误时 MUST 使用编辑能力。

#### Scenario: 不提供删除接口
- **WHEN** 开发数据回流 HTTP Controller
- **THEN** 系统 MUST NOT 提供删除反馈快照的 API

### Requirement: 反馈快照不判断内容成败
系统 SHALL 只记录外部平台表现事实和用户观察，MUST NOT 在数据回流领域判断内容成功或失败，MUST NOT 计算适应度，MUST NOT 修改果实物竞天择状态。

#### Scenario: 创建快照后不修改果实状态
- **WHEN** 用户成功创建反馈快照
- **THEN** 系统 MUST 保留原果实状态不变
- **AND** 系统 MUST NOT 自动选择、淘汰或恢复任何果实
