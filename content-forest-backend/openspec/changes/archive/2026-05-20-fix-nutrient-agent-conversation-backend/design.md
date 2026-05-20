## Context

当前营养研究会话已经有 `messages/stream` 接口、`AgentPort.streamTask`、LLM streaming adapter 和前端乐观消息展示。但链路仍存在断层：ToolRuntime 只写 trace，不向上游流式发事件；LLM 流式输出和营养块解析还没有形成稳定的事件契约；SSE 请求缺少可取消语义；种子级新会话缺少列表恢复能力。

该变更服务于第二期“营养库活化”目标：用户在营养工作台里和 Agent 实时交流，Agent 联网研究时的思考、工具调用、普通答复和可沉淀营养都应被用户看见，而不是在执行结束后一次性出现。

## Goals / Non-Goals

**Goals:**
- 建立营养研究 Agent 对话的后端事件契约，覆盖 thought、tool、message、nutrient、done、error、cancelled。
- 让应用层可以从 nutrient Controller 的 SSE 接口连续获得 Agent 可观察输出。
- 支持种子级研究会话列表，修复新会话刷新后无法恢复的问题。
- 支持前端主动暂停时的请求取消，并尽力向 LLM/Tool 传播 abort signal。
- 保持现有非流式消息提交接口兼容。

**Non-Goals:**
- 不实现通用任务中心或复杂后台任务系统。
- 不持久化 thought/tool 的完整 UI 片段；本期只要求会话事实和最终可恢复结果可恢复。
- 不暴露模型私有思维链；仅展示 provider 明确返回的 reasoning chunk 或系统生成的安全研究进度摘要。
- 不重做营养研究 Skill 的研究方法论。

## Decisions

1. 使用统一 Agent stream event 作为后端内部契约。
   - Agent Runtime 接收来自 LLM、Skill 和 ToolRuntime 的事件，并按顺序转发给应用层。
   - 事件分为用户可理解的类型：thought delta、tool lifecycle、message delta、nutrient block delta、done/error/cancelled。
   - 备选方案是继续用 `progress` 字符串承载所有状态，但前端无法稳定区分 UI 类型。

2. Tool 调用作为流式一等事件。
   - ToolRuntime 在调用开始、进度、完成、失败时发出脱敏事件。
   - 工具输入输出只展示用户可理解摘要，不能包含 API key、绝对路径或内部调试对象。
   - 这样可以满足用户要求的“正在调用 xxx provider / tool”的对话体验。

3. 营养研究 SSE 接口负责事件翻译和持久化边界。
   - Controller/Service 先保存 user message 并发出确认事件。
   - Agent 执行中持续转发可展示事件。
   - Agent 完成后保存 assistant message 和 depositable blocks，再发出最终系统事实事件。
   - 临时流片段不替代最终持久化结果，避免半包内容污染数据库事实。

4. 取消使用 HTTP abort signal 贯穿链路。
   - 前端主动暂停或连接断开时，后端应感知 abort。
   - LLM adapter 使用 fetch abort；Tool/Provider 在可支持时接收 signal。
   - 已保存的 user message 不回滚；如已经产生失败/取消说明，可保存 assistant failure message 便于恢复。

5. 增加种子级会话列表而不是前端本地缓存。
   - 会话属于数据库事实，刷新恢复必须由后端提供。
   - 新接口按 `seedId` 查询会话，可选按 `nutrientCardId` 过滤。
   - API 仍落在 `docs/api/nutrient.yaml` 的 nutrient Controller 契约中。

## Risks / Trade-offs

- [Provider 不支持 reasoning stream] → 后端只透出 provider 明确返回的 thinking/reasoning delta；否则用普通进度或工具事件替代，避免伪造思维链。
- [取消无法立即中止某些外部工具] → 统一传递 signal，工具不支持时至少停止继续写入 SSE，并在任务返回后丢弃非必要中间事件。
- [事件类型增多导致兼容风险] → 保留现有非流式接口；SSE 新增事件采用向后兼容方式，前端未知事件可忽略。
- [工具输出泄密] → ToolRuntime 事件必须走脱敏摘要字段，不直接透传 raw input/output。
