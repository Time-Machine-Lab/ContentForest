## ADDED Requirements

### Requirement: 工作区快照加载
前端 SHALL 在进入种子工作区时，调用 `docs/api/workspace.yaml` 定义的 `GET /api/seeds/{seedId}/workspace` 读取工作区快照，并以快照中的种子、节点、边和资源作为工作区主数据源。

#### Scenario: 加载工作区快照成功
- **WHEN** 用户从种子卡片进入某个种子的工作区页面
- **THEN** 前端 MUST 请求 `GET /api/seeds/{seedId}/workspace`
- **AND** 前端 MUST 根据返回的 `nodes` 与 `edges` 构建内容树
- **AND** 前端 MUST 根据返回的 `resources` 初始化生成器、营养库引用和基因引用选项

#### Scenario: 工作区快照加载失败
- **WHEN** `GET /api/seeds/{seedId}/workspace` 返回错误
- **THEN** 前端 MUST 展示可感知的失败状态
- **AND** 前端 MUST 提供重新加载工作区快照的操作入口

### Requirement: 工作区运行时树布局
前端 SHALL 在后端不提供节点坐标的情况下，根据工作区快照的节点和边生成运行时树布局。节点拖拽位置 MUST 只作为前端运行时状态，不持久化到后端。

#### Scenario: 根据快照构建树布局
- **WHEN** 工作区快照返回节点和边
- **THEN** 前端 MUST 以种子节点作为内容树根节点
- **AND** 前端 MUST 根据父子边关系分层展示果实节点
- **AND** 前端 MUST 使用真实边关系绘制连接线

#### Scenario: 拖拽节点
- **WHEN** 用户拖拽工作区中的种子或果实节点
- **THEN** 前端 MUST 更新当前页面中的节点位置
- **AND** 前端 MUST 同步更新连接线位置
- **AND** 前端 MUST NOT 调用任何节点位置持久化接口

### Requirement: 节点详情读取
前端 SHALL 在用户点击工作区节点时，按节点类型读取对应 Markdown 详情。种子详情 MUST 使用 `docs/api/seed.yaml` 定义的 `GET /api/seeds/{seedId}`，果实详情 MUST 使用 `docs/api/fruit.yaml` 定义的 `GET /api/fruits/{fruitId}`。

#### Scenario: 点击种子节点
- **WHEN** 用户点击工作区中的种子节点
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}` 获取种子 Markdown
- **AND** 前端 MUST 在详情卡片中展示种子标题和 Markdown 正文

#### Scenario: 点击果实节点
- **WHEN** 用户点击工作区中的果实节点
- **THEN** 前端 MUST 调用 `GET /api/fruits/{fruitId}` 获取果实 Markdown
- **AND** 前端 MUST 在详情卡片中展示果实摘要、基因标签、物竞天择状态和 Markdown 正文

### Requirement: 果实物竞天择对接
前端 SHALL 使用 `docs/api/fruit.yaml` 中定义的果实状态接口完成选择、淘汰和恢复候选操作，并在操作成功后同步工作区节点状态。

#### Scenario: 选择候选果实
- **WHEN** 用户在候选果实详情卡片中执行选择操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/select`
- **AND** 前端 MUST 将该果实状态同步为已选择

#### Scenario: 淘汰候选果实
- **WHEN** 用户在候选果实详情卡片中执行淘汰操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/eliminate`
- **AND** 前端 MUST 将该果实状态同步为已淘汰

#### Scenario: 恢复已淘汰果实
- **WHEN** 用户在已淘汰果实详情卡片中执行恢复操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/restore-candidate`
- **AND** 前端 MUST 将该果实状态同步为候选

### Requirement: 枝化生长任务对接
前端 SHALL 使用 `docs/api/growth.yaml` 定义的生长任务接口发起枝化生长、展示生长中状态、轮询任务结果，并在任务完成或失败后刷新工作区快照。

#### Scenario: 发起枝化生长
- **WHEN** 用户在允许生长的节点上提交悬浮输入框
- **THEN** 前端 MUST 调用 `POST /api/growth-tasks`
- **AND** 请求体 MUST 包含 `seedId`、`sourceNodeRef`、`generatorId`
- **AND** 前端 MUST 将输入内容、果实数量、营养库引用、基因引用和详情参数映射到接口契约允许的字段

#### Scenario: 轮询生长任务
- **WHEN** `POST /api/growth-tasks` 创建任务成功
- **THEN** 前端 MUST 将来源节点展示为生长中
- **AND** 前端 MUST 轮询 `GET /api/growth-tasks/{taskId}`
- **AND** 前端 MUST 在任务 `completed` 或 `failed` 后停止轮询
- **AND** 前端 MUST 重新请求 `GET /api/seeds/{seedId}/workspace` 同步最新内容树

#### Scenario: 最近失败输入恢复
- **WHEN** 节点快照中的 `failedInput.hasFailedInput` 为真
- **THEN** 前端 MUST 在节点或输入框附近展示失败提示
- **AND** 前端在用户恢复失败输入时 MUST 调用 `GET /api/growth-sources/{nodeType}/{nodeId}/failed-input`
- **AND** 前端 MUST 将返回的用户输入、生成器、果实数量和引用资源恢复到悬浮输入框

#### Scenario: 重试最近失败任务
- **WHEN** 用户对存在最近失败输入的节点执行重试
- **THEN** 前端 MUST 调用 `POST /api/growth-sources/{nodeType}/{nodeId}/retry`
- **AND** 前端 MUST 按新任务结果进入生长中和轮询流程

### Requirement: 工作区只读约束
前端 SHALL 尊重工作区快照中的 `workspaceReadOnly`，在只读工作区中允许浏览节点和详情，但禁止发起枝化生长和物竞天择写操作。

#### Scenario: 查看只读工作区
- **WHEN** 工作区快照返回 `workspaceReadOnly` 为真
- **THEN** 前端 MUST 允许用户拖拽浏览内容树和查看节点详情
- **AND** 前端 MUST 禁用枝化生长输入提交
- **AND** 前端 MUST 禁用选择、淘汰和恢复候选操作
