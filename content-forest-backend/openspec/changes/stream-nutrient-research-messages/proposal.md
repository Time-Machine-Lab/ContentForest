## Why

营养研究消息当前使用普通 HTTP 提交，后端需要等待 Agent 完整执行后才一次性返回用户消息、Agent 回复和可沉淀营养块，无法支持真实的逐步反馈。

为了让营养汲取具备更接近 Agent 工作流的实时感，需要为研究会话新增 SSE 流式提交能力，同时保留现有非流式接口作为兼容路径。

## What Changes

- 新增营养研究消息流式提交接口，通过 SSE 返回用户消息确认、Agent 进度、Agent 增量内容、可沉淀营养块和完成/失败事件。
- 更新 `docs/api/nutrient.yaml`，将新接口契约作为顶层 API 真相。
- 后端继续通过 Nutrient 应用服务和 AgentPort 执行研究任务，不让 Controller 直接调用 Agent 或存储。
- 保留现有 `POST /api/nutrient-research-sessions/{sessionId}/messages` 非流式接口，不做破坏性变更。
- 流式过程中用户消息先落库并立即返回确认事件；Agent 最终回复和可沉淀营养块仍由应用服务校验后保存。
- 如果当前 AgentPort 暂不支持 token 级流式输出，第一版允许先输出阶段事件和最终内容事件，为后续 LLM token streaming 留出扩展点。

## Capabilities

### New Capabilities

- `nutrient-research-message-streaming`: 定义营养研究会话的 SSE 流式消息提交、事件语义、保存边界和失败恢复。

### Modified Capabilities

- `nutrient-library-management`: 扩展营养研究会话能力，增加流式提交入口，但保持现有非流式消息提交行为兼容。

## Impact

- 影响 `docs/api/nutrient.yaml` 中 Nutrient Controller 对应接口契约。
- 影响后端营养模块应用服务、HTTP Controller、路由装配和测试。
- 可能影响 AgentPort 任务执行结果的事件化包装，但不要求 Agent 直接写数据库或文件。
- 不新增 SQL 表；继续复用研究会话、研究消息和可沉淀营养块存储。
- 需要前端另行接入该 SSE 接口后才能获得完整流式显示体验。
