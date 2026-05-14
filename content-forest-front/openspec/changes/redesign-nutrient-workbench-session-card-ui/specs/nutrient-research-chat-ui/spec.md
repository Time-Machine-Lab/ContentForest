## ADDED Requirements

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
