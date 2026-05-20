## Why

当前营养工作台把研究会话、营养内容和汲取建议同时塞进三栏布局，导致用户难以判断“点击营养内容是在看资产，还是在进入会话”。会话与营养内容的隐式绑定也让可沉淀营养块的“合并到当前内容”产生歧义，尤其是一场会话产出多个营养内容时。

本次变更将前端体验调整为“会话是研究过程，营养内容是沉淀资产”的清晰模型：二者在 UI 中独立浏览、独立删除/归档，只有在用户保存或合并可沉淀营养块时才发生资产沉淀。

## What Changes

- **BREAKING**：营养工作台前端不再把营养内容卡片视为会话入口；点击营养内容只展示营养内容详情。
- 将左侧栏从“营养内容栏”改为“研究会话栏”，展示历史会话、空白新会话入口和会话删除操作。
- 将右侧栏从“营养汲取建议栏”改为“营养内容栏”，提供本地搜索、状态筛选、营养内容卡片摘要和状态化操作。
- 中间区升级为多功能主工作区：
  - 点击会话时显示 Agent 对话流。
  - 点击营养内容时显示营养内容详情与操作。
  - 点击新会话入口时显示空白对话态；首条消息发送后才创建后端会话。
- 将营养汲取建议从常驻右栏迁移到主工作区 header 的消息按钮中，以浮层展示建议卡片和数量提醒。
- 采纳营养汲取建议后，切换到新会话草稿态，并把建议内容填入输入框，等待用户确认发送。
- 可沉淀营养块的操作改为显式目标：
  - 保存为新草稿。
  - 选择合并目标。
  - 合并到用户选中的营养内容。
- 会话删除与营养内容删除互不影响；删除会话不删除已沉淀营养内容。
- 前端实现必须使用 `ui-ux-pro-max` 设计准则：按钮状态清晰、信息层级克制、真实产品界面优先、桌面和窄屏均不可出现遮挡或横向失控。
- 前端开发应参考 SiteInspire、Godly、Lapa Ninja、CSS Design Awards、The FWA 的高级视觉和交互表达，同时以 Mobbin、Refero 的真实产品信息架构为主要落点，避免做成展示型落地页。

## Capabilities

### New Capabilities

- `nutrient-workbench-session-rail-ui`: 定义研究会话栏、新会话草稿态、会话切换和会话删除的前端体验。
- `nutrient-workbench-asset-rail-ui`: 定义营养内容栏、本地搜索、状态筛选、内容详情和资产操作体验。
- `nutrient-workbench-suggestion-popover-ui`: 定义营养汲取建议消息入口、浮层展示、采纳后进入会话草稿的体验。
- `nutrient-depositable-block-targeting-ui`: 定义可沉淀营养块保存为新草稿、选择目标合并和合并确认体验。

### Modified Capabilities

- `nutrient-workbench-experience`: 工作台整体布局、三栏职责和主工作区状态切换发生变化。
- `nutrient-research-chat-ui`: 会话不再依赖营养内容选中态，首条消息发送后才创建会话。
- `nutrient-card-lifecycle-ui`: 营养内容卡片从会话入口改为资产入口，状态操作需要在营养内容栏和详情区中表达。

## Impact

- Affected code:
  - `app/components/nutrient/NutrientWorkbenchDialog.vue`
  - `src/modules/nutrient/api.ts`
  - `src/modules/nutrient/types.ts`
  - nutrient workbench static tests and API client tests
- Affected API usage:
  - Current `docs/api/nutrient.yaml` still contains session/card binding fields and lacks session deletion endpoint. Frontend implementation must wait for backend/API update before enabling true decoupling and deletion.
  - Until backend updates land, proposal/spec/tasks must mark related work as `【依赖后端更新】`.
- Dependencies:
  - Backend/API change for session-card decoupling.
  - Backend/API change for deleting nutrient research sessions.
  - Backend/API change or clarified contract for saving/merging depositable blocks into selected nutrient cards.
- UX risk:
  - The new layout has more modes. Implementation must make the current mode obvious in header, empty state and selected rail item, otherwise用户会再次迷路。
