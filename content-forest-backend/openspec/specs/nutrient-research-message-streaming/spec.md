## Purpose

Defines streaming submission for nutrient research messages, including user-message acknowledgement, Agent progress events, assistant response persistence, candidate nutrient block events, and recoverable failure behavior.

## Requirements

### Requirement: 系统必须提供营养研究消息流式提交接口
系统 MUST 为营养研究会话提供 SSE 流式消息提交接口，并在 `docs/api/nutrient.yaml` 中定义该接口契约。

#### Scenario: 用户提交流式研究消息
- **WHEN** 前端向营养研究会话提交流式研究消息
- **THEN** 系统 MUST 返回 `text/event-stream` 响应
- **AND** 系统 MUST 在 `docs/api/nutrient.yaml` 中定义该接口路径、请求体、响应事件和错误语义

### Requirement: 流式接口必须先确认用户消息
系统 MUST 在流式研究任务开始时保存用户消息，并通过事件通知前端该消息已成为系统事实。

#### Scenario: 用户消息保存成功
- **WHEN** 流式研究接口收到合法消息
- **THEN** 系统 MUST 保存用户研究消息
- **AND** 系统 MUST 发送 `user_message` 事件，事件内容包含已保存的用户消息

### Requirement: 流式接口必须输出 Agent 研究进度
系统 MUST 在 Agent 执行期间输出用户可理解的研究进度事件。

#### Scenario: Agent 进入研究阶段
- **WHEN** Agent 研究任务开始或进入关键阶段
- **THEN** 系统 MUST 发送 `progress` 事件
- **AND** 事件内容 MUST 避免暴露底层密钥、文件绝对路径或工程调试细节

### Requirement: 流式接口必须保存并输出 Assistant 回复
系统 MUST 在 Agent 产生有效回复后保存 Assistant 消息，并通过流式事件返回给前端。

#### Scenario: Agent 返回有效研究结果
- **WHEN** Agent 返回通过校验的营养研究输出
- **THEN** 系统 MUST 保存 Assistant 研究消息
- **AND** 系统 MUST 发送 `assistant_message_delta` 事件返回回复内容
- **AND** 系统 MUST 发送 `done` 事件表示本轮研究完成

### Requirement: 流式接口必须输出可沉淀营养块
系统 MUST 将 Agent 输出中的可沉淀营养块校验并保存后，通过事件返回前端。

#### Scenario: Agent 输出可沉淀营养
- **WHEN** Agent 输出包含可沉淀营养块
- **THEN** 系统 MUST 保存每个可沉淀营养块
- **AND** 系统 MUST 为每个可沉淀营养块发送 `depositable_block` 事件

### Requirement: 流式接口失败必须可恢复
系统 MUST 在流式研究失败时发送失败事件，并允许前端通过已有查询接口恢复会话事实。

#### Scenario: Agent 研究失败
- **WHEN** Agent 任务失败或输出校验失败
- **THEN** 系统 MUST 保存可用的失败信息
- **AND** 系统 MUST 发送 `error` 事件
- **AND** 前端 MUST 能通过已有研究会话详情或消息查询接口重新同步已保存内容
