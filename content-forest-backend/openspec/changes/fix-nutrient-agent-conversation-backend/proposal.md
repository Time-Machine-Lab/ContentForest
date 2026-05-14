## Why

营养研究会话已经具备 SSE 雏形，但当前输出仍偏“任务完成后回填”，无法满足真实 Agent 对话中从接收输入、思考、调用工具、普通回复到可沉淀营养的全过程流式展示。刷新后新会话也缺少种子级恢复入口，导致用户误以为会话丢失。

## What Changes

- 强化营养研究 SSE 契约，让后端能够按时间顺序输出 thought、tool、普通消息、可沉淀营养、完成、失败和取消事件。
- 将 Agent Runtime、LLM Adapter、Tool Runtime 的可观察输出接入营养研究流，而不是只在最终结果返回后生成一次性事件。
- 增加营养研究会话的种子级列表/恢复能力，支持前端打开工作台后找回新建的种子级会话。
- 增加流式请求取消语义：前端断开或主动暂停时，后端应尽力中止 Agent/LLM/Tool 执行，并保存可恢复的会话事实。
- 更新 `docs/api/nutrient.yaml` 中营养研究相关接口和 SSE 事件契约；如涉及会话查询能力，仍归属于 nutrient Controller。
- 不改变现有非流式 `POST /api/nutrient-research-sessions/{sessionId}/messages` 的兼容行为。

## Capabilities

### New Capabilities
- `nutrient-research-session-recovery`: 定义按种子查询和恢复营养研究会话的后端能力。

### Modified Capabilities
- `nutrient-research-message-streaming`: 将营养研究流式消息从“进度 + 最终回填”升级为完整 Agent 对话事件流，并补充取消语义。
- `nutrient-research-agent`: 要求营养研究 Agent 将 LLM 思考、工具调用、普通输出和可沉淀营养以可观察事件暴露给应用层。
- `nutrient-library-management`: 补充 nutrient Controller 在营养研究会话列表/恢复 API 上的顶层契约同步要求。

## Impact

- Affected code: `src/agent/runtime/*`, `src/agent/ports/agent-port.ts`, `src/agent/tools/*`, `src/modules/nutrient/application/nutrient-service.ts`, `src/app/main.ts`, storage adapters and tests.
- Affected API docs: `docs/api/nutrient.yaml`.
- Affected specs: nutrient research Agent, nutrient research streaming, nutrient library management.
- Dependencies: existing LLM provider streaming, networked research providers, and HTTP request abort signal propagation.
