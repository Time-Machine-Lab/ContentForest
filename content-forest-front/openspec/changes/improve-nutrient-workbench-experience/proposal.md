## Why

营养工作台已经具备卡片、建议和 Agent 研究的基础闭环，但当前界面反馈偏慢、层级偏平，用户提交研究消息后必须等待后端完整返回才看到自己的输入，容易误判为无响应。

本次变更先在不修改接口契约的前提下优化营养工作台体验，让它更像一个高密度、可持续研究的 Agent 工作台，而不是简单拼接的后台弹窗。

## What Changes

- 优化营养工作台三栏布局、对话区、营养卡片、可沉淀营养块、建议卡片和输入框视觉层级。
- 优化按钮交互状态，补齐主要按钮、次要按钮、危险按钮、禁用态、加载态和按下反馈。
- 提交研究消息后立即在本地追加用户消息，并展示 Agent 研究中的占位反馈。
- 保留失败时恢复输入、重试和已返回消息不丢失的交互。
- 将卡片详情从阻塞对话的重型预览调整为轻量上下文区，避免对话体验被挤压。
- 强化可沉淀营养块的操作区，让“保留为新卡片 / 合并到当前卡片 / 忽略”更清晰。
- 不引入 SSE，不修改 `docs/api/nutrient.yaml`，仅基于现有营养研究会话接口做前端体验升级。

## Capabilities

### New Capabilities

- `nutrient-workbench-experience`: 定义营养工作台 UI/UX、对话乐观反馈、卡片上下文区、按钮状态和可沉淀营养块交互体验。

### Modified Capabilities

- `nutrient-library-page`: 营养库页面中营养工作台入口对应的工作台体验要求升级，但不改变营养库页面的信息架构和接口契约。

## Impact

- 影响 `app/components/nutrient/NutrientWorkbenchDialog.vue`。
- 影响营养工作台相关静态测试。
- 遵循 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 方向。
- 只使用现有 `docs/api/nutrient.yaml` 中的营养研究会话、消息、可沉淀块、卡片和建议接口。
- 不修改后端接口、SQL 或 Agent 执行逻辑。
