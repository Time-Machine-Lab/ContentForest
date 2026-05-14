## MODIFIED Requirements

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

## ADDED Requirements

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
