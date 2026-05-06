## ADDED Requirements

### Requirement: 创建人工发布记录
系统 SHALL 支持为可发布果实创建人工发布记录。创建发布记录前，系统 MUST 校验该果实具备发布资格；第一期人工发布记录只表示用户已在外部平台完成发布并回填事实，不代表系统自动发布内容。

#### Scenario: 为可发布果实创建发布记录
- **WHEN** 用户为一个可发布果实提交发布目标、发布凭证和发布备注
- **THEN** 系统 MUST 创建一条人工发布记录
- **AND** 系统 MUST 将该发布记录关联到该果实
- **AND** 系统 MUST 使用人工发布器语义记录本次发布验证事实

#### Scenario: 果实不可发布时拒绝创建发布记录
- **WHEN** 用户尝试为不可发布果实创建发布记录
- **THEN** 系统 MUST 拒绝创建发布记录
- **AND** 系统 MUST 不保存任何发布验证事实

### Requirement: 人工发布器不执行外部发布
系统 SHALL 将人工发布器作为第一期唯一可用发布器。人工发布器 MUST 不调用外部平台 API，也 MUST 不声称系统已自动完成发布。

#### Scenario: 使用人工发布器记录外部发布事实
- **WHEN** 用户创建人工发布记录
- **THEN** 系统 MUST 仅记录用户回填的外部发布事实
- **AND** 系统 MUST 不调用任何外部平台发布接口

### Requirement: 发布记录内容边界
系统 SHALL 在发布记录中保存发布目标、发布凭证、发布备注和系统生成的发布时间。发布凭证第一期 MUST 作为文本、链接或说明保存，不支持截图附件上传。

#### Scenario: 保存文本或链接发布凭证
- **WHEN** 用户提交文本、链接或说明作为发布凭证
- **THEN** 系统 MUST 将其保存到发布记录中

#### Scenario: 不支持截图附件作为发布凭证上传
- **WHEN** 用户尝试通过发布验证能力上传截图附件
- **THEN** 系统 MUST 不提供该能力
- **AND** 系统 MUST 不通过发布验证模块保存附件文件

### Requirement: 发布时间跟随发布记录创建时间
系统 SHALL 在创建发布记录时生成发布时间。发布时间 MUST 跟随发布记录创建时间，且 MUST 不作为用户可编辑内容。

#### Scenario: 创建发布记录时生成发布时间
- **WHEN** 系统成功创建发布记录
- **THEN** 系统 MUST 为该发布记录记录创建时刻作为发布时间

#### Scenario: 编辑发布记录时不能修改发布时间
- **WHEN** 用户编辑发布记录
- **THEN** 系统 MUST 保持发布时间不变

### Requirement: 编辑发布记录
系统 SHALL 支持编辑发布目标、发布凭证和发布备注。系统 MUST 不允许编辑发布记录关联的果实，也 MUST 不允许通过编辑将一条发布记录变成另一条发布事实。

#### Scenario: 编辑发布信息
- **WHEN** 用户编辑发布目标、发布凭证或发布备注
- **THEN** 系统 MUST 保存编辑后的发布信息
- **AND** 系统 MUST 保持关联果实不变
- **AND** 系统 MUST 保持发布时间不变

#### Scenario: 试图修改关联果实时拒绝
- **WHEN** 用户尝试将已有发布记录改为关联另一个果实
- **THEN** 系统 MUST 拒绝该操作
- **AND** 系统 MUST 保持原发布记录关联关系不变

### Requirement: 查看发布记录
系统 SHALL 支持查看单条发布记录，并支持按果实列出该果实的所有发布记录。一个果实 MAY 拥有多条发布记录。

#### Scenario: 查看单条发布记录
- **WHEN** 用户请求查看一条存在的发布记录
- **THEN** 系统 MUST 返回该发布记录的发布目标、发布凭证、发布备注、发布时间、发布器语义和关联果实

#### Scenario: 按果实列出发布记录
- **WHEN** 用户请求查看某个果实的发布记录列表
- **THEN** 系统 MUST 返回该果实关联的所有发布记录

#### Scenario: 一个果实拥有多条发布记录
- **WHEN** 用户为同一个可发布果实多次创建发布记录
- **THEN** 系统 MUST 保留每一条发布记录
- **AND** 系统 MUST 将这些记录都关联到该果实

### Requirement: 发布记录作为数据回流入口
系统 SHALL 为后续数据回流领域提供发布记录存在性校验或读取能力。数据回流 MUST 基于已存在的发布记录追加反馈上下文。

#### Scenario: 发布记录存在时可作为数据回流入口
- **WHEN** 后续数据回流能力请求校验一条已存在发布记录
- **THEN** 系统 MUST 返回该发布记录可用

#### Scenario: 发布记录不存在时不能作为数据回流入口
- **WHEN** 后续数据回流能力请求校验一条不存在的发布记录
- **THEN** 系统 MUST 返回发布记录不存在

### Requirement: 禁止删除和归档发布记录
系统 SHALL 不提供发布记录删除能力，也 SHALL 不提供发布记录归档能力。发布记录是内容验证历史的一部分。

#### Scenario: 不支持删除发布记录
- **WHEN** 用户需要移除一条发布记录
- **THEN** 系统 MUST 不提供删除发布记录能力

#### Scenario: 不支持归档发布记录
- **WHEN** 用户需要隐藏一条发布记录
- **THEN** 系统 MUST 不提供归档发布记录能力

### Requirement: 发布验证契约文档
系统 SHALL 为发布验证模块提供顶层 API 与 SQL 契约文档。接口契约 MUST 落到 `docs/api/publication.yaml`，存储结构契约 MUST 落到 `docs/sql/publication.sql`。

#### Scenario: 提供发布验证 API 契约
- **WHEN** 开发发布验证 HTTP Controller
- **THEN** 系统 MUST 存在 `docs/api/publication.yaml`
- **AND** 该契约 MUST 对应单一 Publication Controller

#### Scenario: 提供发布记录 SQL 契约
- **WHEN** 开发发布记录 SQLite 存储适配器
- **THEN** 系统 MUST 存在 `docs/sql/publication.sql`
- **AND** 该契约 MUST 描述发布记录系统事实结构
