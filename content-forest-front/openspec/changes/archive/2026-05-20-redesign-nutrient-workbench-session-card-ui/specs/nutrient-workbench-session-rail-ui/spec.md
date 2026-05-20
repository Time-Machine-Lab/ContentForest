## ADDED Requirements

### Requirement: 工作台必须提供独立研究会话栏
营养工作台 SHALL 在左侧展示当前种子的研究会话列表。会话栏 MUST 只表达研究过程，不把营养内容作为会话入口展示。

#### Scenario: 打开营养工作台加载会话栏
- **WHEN** 用户打开某个种子的营养工作台
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的 `GET /api/seeds/{seedId}/nutrient-research-sessions`
- **AND** 左侧栏 MUST 展示历史研究会话列表
- **AND** 左侧栏 MUST 展示新会话入口

#### Scenario: 点击历史会话
- **WHEN** 用户点击左侧栏中的历史会话
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的 `GET /api/nutrient-research-sessions/{sessionId}`
- **AND** 主工作区 MUST 切换为会话对话模式
- **AND** 当前会话项 MUST 有清晰选中态

### Requirement: 新会话入口必须先进入草稿态
营养工作台 SHALL 支持新会话草稿态。点击新会话入口 MUST NOT 立即创建后端会话；只有用户发送第一条消息时才创建真实会话。

#### Scenario: 点击新会话入口
- **WHEN** 用户点击会话栏的新会话入口
- **THEN** 主工作区 MUST 展示空白对话态
- **AND** 输入框 MUST 可立即输入
- **AND** 前端 MUST NOT 调用 `POST /api/nutrient-research-sessions`

#### Scenario: 新会话草稿发送第一条消息
- **WHEN** 用户在新会话草稿态输入内容并发送
- **THEN** 前端 MUST 先调用 `docs/api/nutrient.yaml` 定义的 `POST /api/nutrient-research-sessions`
- **AND** 创建成功后 MUST 使用返回的会话调用流式消息接口
- **AND** 会话栏 MUST 插入或刷新该新会话

### Requirement: 会话删除必须独立于营养内容
营养工作台 SHALL 为历史会话提供删除入口。删除会话 MUST 只影响研究会话和未沉淀过程数据，不得删除已沉淀营养内容。

#### Scenario: 删除历史会话
- **WHEN** 用户点击某个历史会话的删除按钮并确认
- **THEN** 前端 MUST 调用后端定义的会话删除接口
- **AND** 删除成功后 MUST 从会话栏移除该会话
- **AND** 如果删除的是当前会话，主工作区 MUST 回到新会话草稿态或空态
- **AND** 已存在的营养内容栏 MUST 不被清空

#### Scenario: 后端尚未提供删除接口
- **WHEN** `docs/api/nutrient.yaml` 尚未定义会话删除接口
- **THEN** 前端 MUST 不启用真实删除能力
- **AND** 任务实现 MUST 标记为 `【依赖后端更新】`
