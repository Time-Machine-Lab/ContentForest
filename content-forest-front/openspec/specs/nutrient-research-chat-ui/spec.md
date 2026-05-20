# nutrient-research-chat-ui Specification

## Purpose

定义内容森林前端营养研究对话能力，包括研究消息提交、卡片会话切换、可沉淀营养块展示与研究任务模板交互。
## Requirements
### Requirement: 展示营养研究对话
前端 SHALL 在营养工作台中间区域展示当前种子或当前营养卡片的研究会话。用户 MUST 能输入研究问题并提交给后端，且 Agent 输出 MUST 以完整流式对话形式展示。

#### Scenario: 提交研究问题
- **WHEN** 用户在中间输入框输入研究问题并按回车或点击发送
- **THEN** 前端 MUST 调用营养研究消息提交接口
- **AND** 前端 MUST 立即在消息流中展示用户消息
- **AND** 前端 MUST 在后端 SSE 事件到达时持续更新 Agent 响应状态和内容

#### Scenario: 切换卡片会话
- **WHEN** 用户点击左侧营养卡片
- **THEN** 前端 MUST 加载该卡片绑定的研究会话
- **AND** 如果没有会话，前端 MUST 展示空会话引导

#### Scenario: Agent 流式输出普通内容
- **WHEN** 前端收到普通回复片段事件
- **THEN** 前端 MUST 将片段追加到当前 Assistant 回复块
- **AND** 前端 MUST 不等待 Agent 完整结束后才展示回复正文

### Requirement: 特殊展示可沉淀营养块
前端 SHALL 将后端返回的可沉淀营养块与普通沟通消息区分展示。可沉淀营养块 MUST 提供生成卡片、合并到当前卡片和忽略操作，并 MUST 支持流式增量展示。

#### Scenario: 展示可沉淀营养块
- **WHEN** Agent 响应中包含可沉淀营养块
- **THEN** 前端 MUST 使用特殊卡片样式展示标题、摘要和正文预览
- **AND** 前端 MUST 展示可执行操作

#### Scenario: 流式展示可沉淀营养块
- **WHEN** 前端收到可沉淀营养增量事件
- **THEN** 前端 MUST 将该内容展示为营养成果卡片草稿
- **AND** 前端 MUST 在最终持久化块返回后用后端块替换本地临时块

#### Scenario: 生成未沉淀卡片
- **WHEN** 用户选择从可沉淀营养块生成卡片
- **THEN** 前端 MUST 调用后端接口创建未沉淀营养卡片
- **AND** 创建成功后左侧营养卡片列表 MUST 更新

### Requirement: 提供研究任务模板
前端 SHALL 在营养研究输入区提供轻量研究模板。模板 MUST 包括平台爆款表达、标题/封面套路、竞品内容打法、用户痛点和评论区语言、避雷点、最近趋势变化。

#### Scenario: 使用研究模板
- **WHEN** 用户点击一个研究模板
- **THEN** 前端 MUST 将模板内容填入输入框
- **AND** 用户 MUST 可以继续编辑后再提交

### Requirement: 前端必须区分思考、工具、普通回复和营养内容
前端 SHALL 根据后端 SSE 事件类型将 Agent 输出渲染为不同对话区块，包括思考内容、工具调用内容、普通交流内容和可沉淀营养内容。

#### Scenario: 展示思考内容
- **WHEN** 前端收到 thought 类型流式片段
- **THEN** 前端 MUST 将其展示在独立思考块中
- **AND** 思考块 MUST 支持展开和收起
- **AND** 思考块在完成、失败或取消后 MUST 停止显示永久处理中状态

#### Scenario: 展示工具调用内容
- **WHEN** 前端收到工具调用开始、进度、完成或失败事件
- **THEN** 前端 MUST 将其展示为工具调用块或时间线项
- **AND** 工具调用块 MUST 显示用户可理解的工具名称、状态和摘要

#### Scenario: 展示普通交流内容
- **WHEN** 前端收到普通交流内容片段
- **THEN** 前端 MUST 将其展示为 Assistant 正文
- **AND** 前端 MUST 不把普通正文混入思考块或营养成果卡片

### Requirement: 前端必须支持运行中暂停
前端 SHALL 在营养研究 Agent 运行时将发送按钮切换为暂停按钮，并允许用户中止当前流式请求。

#### Scenario: 发送后按钮切换为暂停
- **WHEN** 用户提交研究消息且 Agent 尚未完成
- **THEN** 输入区主按钮 MUST 显示为暂停操作
- **AND** 前端 MUST 防止重复提交同一条消息

#### Scenario: 用户暂停当前研究
- **WHEN** 用户点击暂停按钮
- **THEN** 前端 MUST 取消当前流式请求
- **AND** 当前 Agent 回复块 MUST 标记为已暂停或已取消
- **AND** 用户 MUST 能继续输入新消息或重试上一条消息

### Requirement: 研究会话不得依赖营养内容选中态
前端 SHALL 将营养研究会话视为独立研究过程。会话创建、切换和流式输出 MUST 不依赖某个营养内容卡片被选中。

#### Scenario: 从会话栏进入历史会话
- **WHEN** 用户点击历史研究会话
- **THEN** 前端 MUST 加载该会话详情
- **AND** 对话流 MUST 在主工作区展示
- **AND** 右侧营养内容选中态 MUST NOT 改变当前会话内容

#### Scenario: 从营养内容详情返回会话
- **WHEN** 用户正在查看营养内容详情并点击某个历史会话
- **THEN** 主工作区 MUST 切换为该会话的对话流
- **AND** 前端 MUST 保留右侧营养内容栏的搜索和筛选状态

### Requirement: 首条消息必须驱动新会话创建
前端 SHALL 在新会话草稿态发送第一条消息时创建会话。创建成功后 MUST 使用该会话执行流式研究。

#### Scenario: 新会话发送首条消息
- **WHEN** 用户在新会话草稿态发送消息
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的 `POST /api/nutrient-research-sessions`
- **AND** 创建成功后 MUST 调用 `POST /api/nutrient-research-sessions/{sessionId}/messages/stream`
- **AND** 前端 MUST 立即展示用户消息和 Agent 运行状态

#### Scenario: 创建会话失败
- **WHEN** 新会话创建接口失败
- **THEN** 前端 MUST 保留用户输入
- **AND** 主工作区 MUST 展示失败状态和重试入口

