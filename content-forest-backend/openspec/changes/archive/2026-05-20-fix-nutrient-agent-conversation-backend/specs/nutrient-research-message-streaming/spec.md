## MODIFIED Requirements

### Requirement: 流式接口必须输出 Agent 研究进度
系统 MUST 在 Agent 执行期间输出用户可理解的研究进度事件，并 MUST 将研究进度区分为思考、工具调用、普通回复和可沉淀营养等可展示类型。

#### Scenario: Agent 进入研究阶段
- **WHEN** Agent 研究任务开始或进入关键阶段
- **THEN** 系统 MUST 发送 `progress` 事件
- **AND** 事件内容 MUST 避免暴露底层密钥、文件绝对路径或工程调试细节

#### Scenario: Agent 输出思考片段
- **WHEN** LLM provider 明确返回 reasoning 或 thinking 流式片段
- **THEN** 系统 MUST 发送 `thought_delta` 事件
- **AND** 系统 MUST 不伪造未由 provider 暴露的私有思维链

#### Scenario: Agent 调用工具
- **WHEN** Agent 准备调用工具、工具运行中、工具完成或工具失败
- **THEN** 系统 MUST 发送工具调用生命周期事件或等价的工具进度事件
- **AND** 事件内容 MUST 包含用户可理解的工具名称、状态和摘要
- **AND** 事件内容 MUST 不包含密钥、绝对路径或原始敏感输入输出

#### Scenario: Agent 输出普通回复片段
- **WHEN** LLM 或 Skill 产生面向用户的普通沟通内容
- **THEN** 系统 MUST 发送 `message_delta` 事件
- **AND** 前端 MUST 能在任务完成前逐步展示该内容

### Requirement: 流式接口必须保存并输出 Assistant 回复
系统 MUST 在 Agent 产生有效回复后保存 Assistant 消息，并通过流式事件返回给前端。系统 MAY 在保存前发送临时 `message_delta` 事件，但最终 MUST 以已保存的 Assistant 消息作为系统事实。

#### Scenario: Agent 返回有效研究结果
- **WHEN** Agent 返回通过校验的营养研究输出
- **THEN** 系统 MUST 保存 Assistant 研究消息
- **AND** 系统 MUST 发送 `assistant_message_delta` 事件返回已保存回复内容
- **AND** 系统 MUST 发送 `done` 事件表示本轮研究完成

#### Scenario: 临时片段与最终消息合并
- **WHEN** 前端已经收到一个或多个 `message_delta` 临时片段
- **THEN** 系统 MUST 在最终保存完成后发送包含已保存 Assistant 消息的完成事件
- **AND** 前端 MUST 能用最终消息替换或确认临时片段

### Requirement: 流式接口失败必须可恢复
系统 MUST 在流式研究失败、取消或连接中断时发送可理解事件，并允许前端通过已有查询接口恢复会话事实。

#### Scenario: Agent 研究失败
- **WHEN** Agent 任务失败或输出校验失败
- **THEN** 系统 MUST 保存可用的失败信息
- **AND** 系统 MUST 发送 `error` 事件
- **AND** 前端 MUST 能通过已有研究会话详情或消息查询接口重新同步已保存内容

#### Scenario: 用户主动取消研究
- **WHEN** 前端在 Agent 运行中主动取消流式请求
- **THEN** 系统 MUST 尽力中止 LLM 和工具执行
- **AND** 系统 MUST 不回滚已经保存的用户消息
- **AND** 系统 MUST 让前端能够通过会话详情恢复已保存消息和失败或取消状态

## ADDED Requirements

### Requirement: 流式接口必须支持请求取消信号
系统 SHALL 在营养研究 SSE 请求中接收连接断开或主动取消信号，并将该信号传递给 Agent Runtime、LLM Adapter 和支持取消的 Tool Provider。

#### Scenario: 前端断开 SSE 连接
- **WHEN** SSE 连接在 Agent 完成前断开
- **THEN** 系统 MUST 停止向该连接写入事件
- **AND** 系统 MUST 尽力停止继续执行可取消的下游 LLM 或工具调用

#### Scenario: 下游组件不支持取消
- **WHEN** 某个工具或 provider 不支持取消
- **THEN** 系统 MUST 不要求其立即终止
- **AND** 系统 MUST 避免将断开连接后的非必要临时片段继续写入已断开的 SSE 响应
