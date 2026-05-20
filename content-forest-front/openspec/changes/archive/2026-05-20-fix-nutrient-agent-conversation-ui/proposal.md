## Why

营养工作台当前已经接入流式接口，但用户侧体验仍不像真实 AI 对话：用户消息反馈不够稳定，思考块不可折叠且会一直显示处理中，工具调用不可见，发送中无法暂停，新建会话刷新后也缺少恢复入口。需要把后端 Agent 事件流转化为清晰、可控、可恢复的对话界面。

## What Changes

- 将营养研究对话 UI 改为完整流式渲染：按事件类型展示思考、工具调用、普通回复和可沉淀营养内容。
- 修复 thought 展示：思考块应可展开/收起，可结束，不再出现永久处理中的进度条。
- 发送按钮在 Agent 运行中切换为暂停按钮，支持用户主动中止当前流式请求。
- 打开营养工作台时加载种子级研究会话列表，支持新会话刷新后恢复、切换和继续对话。
- 按 `ui-ux-pro-max` 方向优化对话区、输入框、发送/暂停/重试按钮、工具调用块、思考块和可沉淀营养卡片的视觉层级。
- 前端必须继续以 `docs/api/nutrient.yaml` 为契约来源；缺失的会话列表/取消/事件类型由后端提案补充。

## Capabilities

### New Capabilities
- `nutrient-research-session-recovery-ui`: 定义前端加载、切换和恢复种子级营养研究会话的体验能力。

### Modified Capabilities
- `nutrient-research-chat-ui`: 将营养研究对话从简单响应展示升级为分类型流式 Agent 对话。
- `nutrient-workbench-experience`: 优化营养工作台布局、按钮状态、运行中暂停、空白态和刷新恢复体验。

## Impact

- Affected code: `app/components/nutrient/NutrientWorkbenchDialog.vue`, `src/modules/nutrient/api.ts`, `src/modules/nutrient/types.ts`, nutrient page/workspace integration if needed.
- Affected API usage: `docs/api/nutrient.yaml` 中营养研究 SSE、会话详情、会话列表/恢复接口。
- Affected UX: chat stream rendering, session switching, cancel/retry behavior, responsive dialog layout.
- Dependency: backend change `fix-nutrient-agent-conversation-backend` must define the final stream event and session recovery contract.
