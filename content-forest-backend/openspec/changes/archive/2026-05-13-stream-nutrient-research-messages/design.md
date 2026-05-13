## Context

营养研究会话当前只有非流式消息提交接口。应用服务会先保存用户消息，再调用 AgentPort 执行 `nutrient_research` 任务，等 Agent 完整返回后保存 Agent 消息和可沉淀营养块，最后一次性响应前端。

这种模式系统边界清晰，但对耗时 Agent 研究不友好：前端无法获得用户消息确认、阶段进度或增量内容。根据后端开发规范，新增能力必须继续遵守“Controller 只做 HTTP 适配、应用服务维护系统事实、Agent 通过 AgentPort 解耦、Agent 输出不直接落地”的边界。

## Goals / Non-Goals

**Goals:**

- 为营养研究会话新增 SSE 流式提交能力。
- 保留现有非流式消息提交接口兼容性。
- 将 SSE 事件语义写入 `docs/api/nutrient.yaml`。
- 让用户消息确认、Agent 阶段进度、最终回复、可沉淀营养块和失败都能被前端实时感知。
- 第一版不要求底层 LLM 支持 token 级流式；可以先输出阶段事件和最终内容事件。

**Non-Goals:**

- 不替换 AgentPort 架构。
- 不允许 Agent 直接写数据库、文件或响应流。
- 不新增数据库表。
- 不引入 WebSocket。
- 不废弃现有 `POST /api/nutrient-research-sessions/{sessionId}/messages`。

## Decisions

### 1. 使用新增 SSE 接口而不是改造现有 POST 响应

新增流式提交入口，例如 `POST /api/nutrient-research-sessions/{sessionId}/messages/stream`，响应 `text/event-stream`。

理由：现有接口返回 JSON，直接改变响应格式会破坏前端和测试；新增接口可以兼容演进。

替代方案：为原接口增加 query 参数切换流式。这个方案容易让同一路由产生两种响应格式，Controller 和客户端封装都更混乱。

### 2. 应用服务负责生成领域事件，Controller 只负责写 SSE

营养应用服务暴露流式任务方法，返回或回调标准化事件；Controller 将事件序列化为 SSE 格式。

理由：保存消息、调用 Agent、校验输出和创建可沉淀块都属于应用服务边界，Controller 不应承载业务规则。

替代方案：Controller 内部手动保存用户消息并调用 Agent。该方案违反现有后端分层。

### 3. 事件分为用户确认、进度、内容、可沉淀块、完成、失败

第一版事件语义固定为有限集合，满足前端可测试和可恢复：

- `user_message`: 用户消息已保存。
- `progress`: Agent 研究阶段或执行状态。
- `assistant_message_delta`: Agent 回复内容增量；第一版可只发送一次完整内容。
- `depositable_block`: 已保存的可沉淀营养块。
- `done`: 本轮研究完成。
- `error`: 本轮研究失败。

理由：前端需要的不只是文本流，还需要知道哪些内容已经成为系统事实。

替代方案：只输出文本 token。这个方案无法表达可沉淀块、失败原因和保存状态。

### 4. 先支持准流式，预留 token streaming

如果当前 AgentPort 只能返回最终结果，应用服务仍然可以在执行前发送用户确认和进度事件，在执行后发送完整 Assistant 内容和可沉淀块事件。

理由：这样能先打通协议和前端体验，不强迫立即重构 Agent Runtime。

替代方案：等 AgentPort 支持原生流式后再做。会让前端体验继续卡在无反馈状态。

## Risks / Trade-offs

- [Risk] SSE 连接中断导致前端状态不完整 → 前端可通过已有 GET 会话详情和消息列表接口重新同步系统事实。
- [Risk] AgentPort 暂无 token 级流式能力 → 第一版用阶段事件和最终内容事件，后续再扩展增量 token。
- [Risk] Controller 写流时错误处理复杂 → 将业务错误转为 `error` 事件，并确保响应结束。
- [Risk] 重复提交导致并发研究混乱 → 沿用现有会话消息保存规则，必要时在前端禁用同一会话重复提交。
