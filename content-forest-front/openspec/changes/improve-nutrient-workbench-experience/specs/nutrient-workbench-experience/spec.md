## ADDED Requirements

### Requirement: 营养工作台必须提供高密度研究布局
营养工作台 MUST 使用清晰的三栏工作区组织营养卡片、Agent 研究和汲取建议，并在窄屏下使用分区切换保持主要路径可用。

#### Scenario: 桌面端打开营养工作台
- **WHEN** 用户从种子工作区或种子专属营养库打开营养工作台
- **THEN** 系统 MUST 同时展示营养卡片列表、Agent 研究区和汲取建议区
- **AND** Agent 研究区 MUST 是主要视觉焦点

#### Scenario: 窄屏查看营养工作台
- **WHEN** 可用宽度不足以稳定展示三栏
- **THEN** 系统 MUST 提供卡片、Agent、建议的分区切换
- **AND** 当前分区内容 MUST 不与其他分区内容重叠

### Requirement: 研究消息提交必须有即时反馈
营养工作台 MUST 在用户提交研究消息后立即展示本地用户消息和 Agent 研究中的反馈，不得等到后端完整返回后才显示用户输入。

#### Scenario: 用户提交研究消息
- **WHEN** 用户在 Agent 输入框输入内容并发送
- **THEN** 系统 MUST 立即在消息列表中展示用户本次输入
- **AND** 系统 MUST 展示 Agent 正在研究的占位反馈
- **AND** 系统 MUST 调用 `docs/api/nutrient.yaml` 定义的 `POST /api/nutrient-research-sessions/{sessionId}/messages`

#### Scenario: 研究消息提交失败
- **WHEN** 研究消息提交接口返回失败
- **THEN** 系统 MUST 保留用户原始输入
- **AND** 系统 MUST 将 Agent 占位反馈转为失败反馈
- **AND** 系统 MUST 提供重试入口

### Requirement: 营养卡片上下文不得阻塞对话
选中营养卡片后，Agent 研究区 MUST 以轻量上下文展示当前卡片，完整卡片内容 MUST 通过展开或详情入口查看。

#### Scenario: 用户选中营养卡片
- **WHEN** 用户点击左侧营养卡片
- **THEN** 系统 MUST 加载该卡片详情
- **AND** 系统 MUST 在 Agent 研究区展示卡片标题、状态和核心操作
- **AND** 系统 MUST 避免完整 Markdown 长内容默认占据主要对话空间

### Requirement: 可沉淀营养必须作为成果卡展示
Agent 返回的可沉淀营养块 MUST 与普通聊天消息区分展示，并提供保留、合并和忽略操作。

#### Scenario: Agent 返回可沉淀营养块
- **WHEN** `POST /api/nutrient-research-sessions/{sessionId}/messages` 返回 `depositableBlocks`
- **THEN** 系统 MUST 以成果卡形式展示每个可沉淀营养块
- **AND** 每个成果卡 MUST 提供保留为新卡片、合并到当前卡片、忽略操作

### Requirement: 工作台按钮必须表达清晰状态
营养工作台中的主要按钮、次要按钮、危险按钮和加载按钮 MUST 通过视觉状态表达优先级和当前可操作性。

#### Scenario: 用户查看可操作按钮
- **WHEN** 按钮处于默认、悬停、按下、禁用或加载状态
- **THEN** 系统 MUST 以可感知的视觉反馈表达该状态
- **AND** 系统 MUST 防止加载中的重复提交
