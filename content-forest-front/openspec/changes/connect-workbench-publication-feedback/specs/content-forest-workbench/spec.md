## ADDED Requirements

### Requirement: 工作区接入人工发布记录
前端 SHALL 在种子工作区果实详情中接入人工发布记录能力。该能力 MUST 使用 `docs/api/publication.yaml` 中定义的 `POST /api/publication-records` 创建发布记录，且 MUST 只允许已选择果实发起发布记录创建。

#### Scenario: 已选择果实创建发布记录
- **WHEN** 用户选中已选择果实并打开人工发布记录创建入口
- **THEN** 前端 MUST 展示发布目标、发布凭证和发布备注输入
- **AND** 用户提交后前端 MUST 调用 `POST /api/publication-records`
- **AND** 请求体 MUST 包含当前果实的 `fruitId`、`publicationTarget` 和 `publicationEvidence`

#### Scenario: 候选或已淘汰果实不可创建发布记录
- **WHEN** 用户选中候选果实或已淘汰果实
- **THEN** 前端 MUST NOT 展示可执行的发布记录创建按钮
- **AND** 前端 MUST 表达只有已选择果实才能进入发布验证

#### Scenario: 只读工作区禁止创建发布记录
- **WHEN** 工作区处于只读状态
- **THEN** 前端 MUST 禁用发布记录创建能力
- **AND** 前端 MUST 保留发布记录查看能力

### Requirement: 工作区展示和编辑发布记录
前端 SHALL 在果实详情中展示当前果实的发布记录列表。列表数据 MUST 使用 `docs/api/publication.yaml` 中定义的 `GET /api/fruits/{fruitId}/publication-records` 获取；编辑发布记录 MUST 使用 `PATCH /api/publication-records/{publicationRecordId}`。

#### Scenario: 打开发布记录列表
- **WHEN** 用户在果实详情中打开发布记录区域
- **THEN** 前端 MUST 调用 `GET /api/fruits/{fruitId}/publication-records`
- **AND** 前端 MUST 展示该果实关联的全部发布记录
- **AND** 每条记录 MUST 展示发布目标、发布凭证、发布备注、发布器语义和发布时间

#### Scenario: 编辑发布记录
- **WHEN** 用户编辑一条发布记录的发布目标、发布凭证或发布备注
- **THEN** 前端 MUST 调用 `PATCH /api/publication-records/{publicationRecordId}`
- **AND** 前端 MUST NOT 尝试修改发布记录关联的果实或发布时间
- **AND** 编辑成功后前端 MUST 刷新该发布记录展示

#### Scenario: 发布记录为空
- **WHEN** 已选择果实尚无发布记录
- **THEN** 前端 MUST 展示空状态
- **AND** 前端 MUST 提供创建人工发布记录的入口

### Requirement: 发布记录作为数据回流入口
前端 SHALL 将数据回流入口展示在具体发布记录下，而不是直接挂在果实一级。监控器挂载、反馈快照创建和反馈历史查看 MUST 基于后端 `add-feedback-module` 提供的 `docs/api/feedback.yaml` 契约实现。

#### Scenario: 发布记录下展示数据回流入口
- **WHEN** 用户查看某条发布记录
- **THEN** 前端 MUST 在该发布记录范围内展示监控器和数据反馈入口
- **AND** 前端 MUST 表达数据反馈属于该发布记录而不是整个果实

#### Scenario: 无发布记录时不允许录入反馈
- **WHEN** 当前果实没有任何发布记录
- **THEN** 前端 MUST NOT 提供反馈快照创建入口
- **AND** 前端 MUST 提示需要先创建发布记录

#### Scenario: 反馈 API 契约未存在时标记依赖
- **WHEN** `docs/api/feedback.yaml` 尚未由后端提案落地
- **THEN** 前端实现任务 MUST NOT 私自定义反馈接口
- **AND** 前端任务 MUST 将监控器和反馈快照真实对接标记为依赖后端更新

### Requirement: 工作区接入人为监控器和反馈快照
在 `docs/api/feedback.yaml` 可用后，前端 SHALL 支持在发布记录下挂载人为监控器、创建反馈快照、编辑反馈快照和查看反馈历史。表现数据 MUST 保持自由结构，不做固定平台指标枚举。

#### Scenario: 挂载人为监控器
- **WHEN** 用户在未挂载监控器的发布记录下点击挂载监控器
- **THEN** 前端 MUST 调用 `docs/api/feedback.yaml` 定义的监控器挂载接口
- **AND** 前端 MUST 在成功后展示该发布记录已挂载人为监控器

#### Scenario: 创建反馈快照
- **WHEN** 用户在已挂载监控器的发布记录下提交表现数据和用户观察
- **THEN** 前端 MUST 调用 `docs/api/feedback.yaml` 定义的反馈快照创建接口
- **AND** 前端 MUST 保留自由结构表现数据输入
- **AND** 创建成功后前端 MUST 刷新该发布记录的反馈历史

#### Scenario: 编辑反馈快照
- **WHEN** 用户编辑已有反馈快照
- **THEN** 前端 MUST 调用 `docs/api/feedback.yaml` 定义的反馈快照编辑接口
- **AND** 前端 MUST NOT 提供删除反馈快照的能力

#### Scenario: 查看反馈历史
- **WHEN** 用户打开发布记录的数据反馈区域
- **THEN** 前端 MUST 调用 `docs/api/feedback.yaml` 定义的反馈历史查询接口
- **AND** 前端 MUST 展示该发布记录下的全部反馈快照
