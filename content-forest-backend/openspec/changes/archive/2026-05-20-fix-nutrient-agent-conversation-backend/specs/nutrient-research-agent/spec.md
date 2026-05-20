## ADDED Requirements

### Requirement: 营养研究 Agent 必须暴露可观察对话事件
系统 SHALL 让营养研究 Agent 在执行过程中暴露可观察事件，供营养研究 SSE 接口转发为用户可理解的对话流。

#### Scenario: LLM 流式输出普通内容
- **WHEN** 营养研究 Skill 调用支持流式输出的 LLM
- **THEN** Agent MUST 将普通内容片段转化为 `message_delta` 类型事件
- **AND** Agent MUST 在最终结果中继续返回可校验的结构化输出

#### Scenario: LLM 流式输出思考内容
- **WHEN** LLM provider 返回 reasoning 或 thinking 片段
- **THEN** Agent MUST 将该片段转化为 `thought_delta` 类型事件
- **AND** Agent MUST 不从普通正文中推断或伪造思考内容

#### Scenario: Agent 调用联网研究工具
- **WHEN** 营养研究 Skill 调用联网搜索、外部研究 provider 或其他工具
- **THEN** Agent MUST 发出工具开始、工具进度、工具完成或工具失败的可观察事件
- **AND** 工具事件 MUST 使用脱敏摘要描述工具行为

### Requirement: 营养研究 Agent 必须支持取消信号
系统 SHALL 允许营养研究 Agent 接收取消信号，并将其传递给支持取消的 LLM Adapter 和 Tool Provider。

#### Scenario: 取消正在运行的 LLM 请求
- **WHEN** 应用层在 LLM 流式请求未完成时发出取消信号
- **THEN** Agent MUST 将取消信号传递给 LLM Adapter
- **AND** LLM Adapter MUST 尽力终止正在进行的 provider 请求

#### Scenario: 取消正在运行的工具请求
- **WHEN** 应用层在工具运行中发出取消信号
- **THEN** Agent MUST 将取消信号传递给支持取消的 Tool Provider
- **AND** 不支持取消的 Tool Provider MUST 不阻塞事件流的关闭
