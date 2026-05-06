## ADDED Requirements

### Requirement: 查看未归档种子库
前端 SHALL 在种子库默认视图中展示未归档种子卡片网格。该视图 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds`，并只使用 `SeedSummary` 契约中存在的信息进行卡片展示。

#### Scenario: 打开种子库默认视图
- **WHEN** 用户打开种子库页面
- **THEN** 前端 MUST 调用 `GET /api/seeds`
- **AND** 前端 MUST 以卡片网格展示返回的未归档种子

#### Scenario: 未归档种子为空
- **WHEN** `GET /api/seeds` 返回空列表
- **THEN** 前端 MUST 展示空状态
- **AND** 前端 MUST 提供新建种子的操作入口

### Requirement: 查看已归档种子
前端 SHALL 在种子库页面内部提供已归档视图。该视图 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/archived`，并展示已归档种子卡片。

#### Scenario: 切换到已归档视图
- **WHEN** 用户在种子库页面切换到已归档视图
- **THEN** 前端 MUST 调用 `GET /api/seeds/archived`
- **AND** 前端 MUST 展示返回的已归档种子

#### Scenario: 已归档种子为空
- **WHEN** `GET /api/seeds/archived` 返回空列表
- **THEN** 前端 MUST 展示已归档视图的空状态

### Requirement: 查看种子详情
前端 SHALL 支持用户从种子卡片打开种子详情。详情数据 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/{seedId}` 获取，并展示标题、归档状态和 Markdown 正文。

#### Scenario: 选择种子卡片
- **WHEN** 用户点击一个种子卡片
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}`
- **AND** 前端 MUST 在右侧详情面板展示该种子的详情

#### Scenario: 详情读取失败
- **WHEN** `GET /api/seeds/{seedId}` 返回错误
- **THEN** 前端 MUST 在详情区域展示可理解的失败反馈
- **AND** 前端 MUST 保持种子库列表可用

### Requirement: 创建种子
前端 SHALL 通过居中 Command Modal 创建种子。创建请求 MUST 调用 `docs/api/seed.yaml` 中定义的 `POST /api/seeds`，并提交非空标题和非空 Markdown 正文。

#### Scenario: 成功创建种子
- **WHEN** 用户在 Command Modal 中提交非空标题和非空 Markdown 正文
- **THEN** 前端 MUST 调用 `POST /api/seeds`
- **AND** 前端 MUST 在创建成功后关闭 Command Modal
- **AND** 前端 MUST 刷新当前种子视图或将新种子插入当前视图

#### Scenario: 阻止空标题或空正文创建
- **WHEN** 用户提交空标题或空 Markdown 正文
- **THEN** 前端 MUST 阻止提交 `POST /api/seeds`
- **AND** 前端 MUST 在 Command Modal 中展示字段错误

#### Scenario: 创建请求失败
- **WHEN** `POST /api/seeds` 返回错误
- **THEN** 前端 MUST 保留用户已输入的标题和 Markdown 正文
- **AND** 前端 MUST 展示创建失败反馈

### Requirement: 编辑种子
前端 SHALL 支持在右侧详情面板中编辑种子标题和 Markdown 正文。编辑请求 MUST 调用 `docs/api/seed.yaml` 中定义的 `PATCH /api/seeds/{seedId}`。

#### Scenario: 成功保存编辑
- **WHEN** 用户在详情面板中提交非空标题或非空 Markdown 正文更新
- **THEN** 前端 MUST 调用 `PATCH /api/seeds/{seedId}`
- **AND** 前端 MUST 使用接口返回的 `SeedDetail` 更新详情面板
- **AND** 前端 MUST 同步更新种子卡片中可见的标题和更新时间

#### Scenario: 阻止空内容保存
- **WHEN** 用户将标题或 Markdown 正文编辑为空并尝试保存
- **THEN** 前端 MUST 阻止提交 `PATCH /api/seeds/{seedId}`
- **AND** 前端 MUST 展示字段错误

#### Scenario: 保存失败
- **WHEN** `PATCH /api/seeds/{seedId}` 返回错误
- **THEN** 前端 MUST 保留用户未保存的编辑内容
- **AND** 前端 MUST 展示保存失败反馈

### Requirement: 归档与回档种子
前端 SHALL 支持用户归档未归档种子和回档已归档种子。归档 MUST 调用 `docs/api/seed.yaml` 中定义的 `POST /api/seeds/{seedId}/archive`，回档 MUST 调用 `POST /api/seeds/{seedId}/restore`。

#### Scenario: 归档未归档种子
- **WHEN** 用户在未归档种子详情中执行归档
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/archive`
- **AND** 前端 MUST 将该种子从未归档视图中移除或刷新未归档视图

#### Scenario: 回档已归档种子
- **WHEN** 用户在已归档种子详情中执行回档
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/restore`
- **AND** 前端 MUST 将该种子从已归档视图中移除或刷新已归档视图

#### Scenario: 归档或回档失败
- **WHEN** 归档或回档接口返回错误
- **THEN** 前端 MUST 保持当前种子状态不变
- **AND** 前端 MUST 展示操作失败反馈

### Requirement: 种子工作区入口
前端 SHALL 在种子详情面板中提供进入工作区的入口。入口需要使用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/{seedId}/root-node` 读取根节点信息；已归档种子的工作区 MUST 以只读语义进入或展示只读提示。

#### Scenario: 打开未归档种子的工作区入口
- **WHEN** 用户点击未归档种子详情中的打开工作区入口
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}/root-node`
- **AND** 前端 MUST 使用返回的根节点信息进入对应种子工作区路由或工作区占位视图

#### Scenario: 打开已归档种子的工作区入口
- **WHEN** 用户点击已归档种子详情中的打开工作区入口
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}/root-node`
- **AND** 前端 MUST 根据返回的 `workspaceReadOnly` 展示只读工作区语义

### Requirement: 种子 API 错误与加载反馈
前端 SHALL 为所有种子 API 调用提供加载、成功和失败反馈。失败反馈 MUST 不清空用户输入，且 MUST 不让前端将失败操作伪装为系统事实。

#### Scenario: 列表加载中
- **WHEN** 前端正在请求种子列表
- **THEN** 前端 MUST 展示列表加载状态

#### Scenario: 写操作进行中
- **WHEN** 前端正在创建、编辑、归档或回档种子
- **THEN** 前端 MUST 禁用对应提交入口或展示进行中状态
- **AND** 前端 MUST 保持其他不冲突的页面浏览能力

#### Scenario: 写操作失败
- **WHEN** 创建、编辑、归档或回档请求失败
- **THEN** 前端 MUST 展示失败反馈
- **AND** 前端 MUST 不基于失败请求更新种子系统状态
