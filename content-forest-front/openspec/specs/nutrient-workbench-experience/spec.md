# nutrient-workbench-experience Specification

## Purpose

定义内容森林前端优化后的营养工作台体验，包括高密度研究布局、即时消息反馈、成果卡展示、上下文切换和清晰按钮状态。
## Requirements
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
营养工作台 MUST 在用户提交研究消息后立即展示本地用户消息和 Agent 研究中的反馈，不得等到后端完整返回后才显示用户输入。运行中的反馈 MUST 支持按事件类型持续更新。

#### Scenario: 用户提交研究消息
- **WHEN** 用户在 Agent 输入框输入内容并发送
- **THEN** 系统 MUST 立即在消息列表中展示用户本次输入
- **AND** 系统 MUST 展示 Agent 正在研究的占位反馈
- **AND** 系统 MUST 调用 `docs/api/nutrient.yaml` 定义的营养研究流式消息接口

#### Scenario: 研究消息提交失败
- **WHEN** 研究消息提交接口返回失败
- **THEN** 系统 MUST 保留用户原始输入
- **AND** 系统 MUST 将 Agent 占位反馈转为失败反馈
- **AND** 系统 MUST 提供重试入口

#### Scenario: 流式事件持续到达
- **WHEN** 后端持续返回 Agent 对话流事件
- **THEN** 系统 MUST 按事件类型更新对应的消息块、思考块、工具块或营养成果卡
- **AND** 系统 MUST 避免把所有事件覆盖到同一个处理中占位文本中

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
营养工作台中的主要按钮、次要按钮、危险按钮和加载按钮 MUST 通过视觉状态表达优先级和当前可操作性。Agent 运行中，输入区主按钮 MUST 表达暂停能力。

#### Scenario: 用户查看可操作按钮
- **WHEN** 按钮处于默认、悬停、按下、禁用或加载状态
- **THEN** 系统 MUST 以可感知的视觉反馈表达该状态
- **AND** 系统 MUST 防止加载中的重复提交

#### Scenario: Agent 正在运行
- **WHEN** 当前研究会话存在进行中的流式请求
- **THEN** 输入区主按钮 MUST 从发送状态切换为暂停状态
- **AND** 暂停按钮 MUST 比普通次要操作更容易识别

### Requirement: 营养工作台对话视觉必须达到产品级质量
营养工作台 SHALL 使用清晰、克制、有层级的 Agent 对话视觉设计。输入框、发送/暂停按钮、重试按钮、消息块、思考块、工具块和可沉淀营养卡片 MUST 在暗色工作台中保持一致的视觉语言。

#### Scenario: 查看对话区域
- **WHEN** 用户查看营养工作台中间对话区域
- **THEN** 普通消息、思考内容、工具调用和营养成果 MUST 有明显但不过度割裂的视觉区分
- **AND** 文本、按钮和卡片内容 MUST 在常见桌面和窄屏宽度下不重叠、不溢出

#### Scenario: 查看空会话
- **WHEN** 当前研究会话没有历史消息
- **THEN** 系统 MUST 展示轻量空态、研究模板或输入引导
- **AND** 系统 MUST 不出现大面积无意义空白

### Requirement: 营养工作台必须优雅处理运行中状态
营养工作台 SHALL 在 Agent 运行时提供稳定的滚动、输入、暂停和错误恢复体验。

#### Scenario: Agent 输出长内容
- **WHEN** Agent 持续流式输出较长内容
- **THEN** 消息列表 MUST 保持可读的滚动体验
- **AND** 输入框 MUST 保持可访问且不被消息内容遮挡

#### Scenario: Agent 运行中失败
- **WHEN** 当前流式请求失败
- **THEN** 系统 MUST 将当前回复块标记为失败
- **AND** 系统 MUST 展示重试入口
- **AND** 系统 MUST 保留用户上一条输入用于重试

### Requirement: 营养工作台必须使用过程与资产分离布局
营养工作台 SHALL 使用“左侧会话栏、中间主工作区、右侧营养内容栏”的布局。布局 MUST 明确区分研究过程和沉淀资产。

#### Scenario: 桌面端打开工作台
- **WHEN** 用户打开营养工作台
- **THEN** 左侧栏 MUST 展示研究会话
- **AND** 中间区 MUST 展示当前会话、新会话草稿或营养内容详情
- **AND** 右侧栏 MUST 展示营养内容资产
- **AND** 汲取建议 MUST 通过主工作区 header 的消息入口访问

#### Scenario: 窄屏查看工作台
- **WHEN** 可用宽度不足以稳定展示三栏
- **THEN** 前端 MUST 提供会话、主工作区、营养内容的分区切换
- **AND** 当前分区内容 MUST 不与其他分区内容重叠

### Requirement: 主工作区必须表达当前模式
营养工作台主工作区 SHALL 清晰表达当前模式。用户 MUST 能分辨当前正在查看历史会话、新会话草稿、营养内容详情或建议浮层。

#### Scenario: 查看会话模式
- **WHEN** 用户选中历史会话
- **THEN** 主工作区 header MUST 展示会话标题或会话摘要
- **AND** 主工作区 MUST 展示对话流和输入框

#### Scenario: 查看营养内容详情模式
- **WHEN** 用户选中右侧营养内容卡片
- **THEN** 主工作区 header MUST 展示营养内容标题和状态
- **AND** 主工作区 MUST 展示 Markdown 内容和可用资产操作

#### Scenario: 查看新会话草稿模式
- **WHEN** 用户点击新会话入口
- **THEN** 主工作区 MUST 展示空白对话引导
- **AND** 主工作区 MUST 展示可输入的消息输入框

### Requirement: 工作台视觉必须达到产品级质量
营养工作台 SHALL 使用克制、有层级、可扫描的产品界面设计。按钮、卡片、输入框、浮层和状态反馈 MUST 遵循 `ui-ux-pro-max` 设计准则。

#### Scenario: 查看主要操作按钮
- **WHEN** 按钮处于默认、悬停、聚焦、加载、禁用或危险状态
- **THEN** 前端 MUST 使用可感知视觉差异表达状态
- **AND** 前端 MUST 避免文字溢出和按钮尺寸跳动

#### Scenario: 查看三栏内容
- **WHEN** 会话、营养内容或建议数量较多
- **THEN** 每个栏位 MUST 独立滚动
- **AND** 主工作区输入框 MUST 保持可访问
- **AND** 页面 MUST 不出现无意义横向溢出

