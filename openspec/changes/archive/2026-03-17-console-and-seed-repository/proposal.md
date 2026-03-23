## Why

目前内容森林只有落地页和 Demo 页，用户没有实际可操作的管理界面。控制台是整个产品的核心入口，种子库是内容生产的第一步——没有控制台，所有后端能力都无法被用户触达。

## What Changes

- 新增控制台页面 (`/console`)，作为用户日常操作的核心工作台
- 控制台采用「顶部极简导航 + 快速操作栏 + 主内容区」双层导航架构
- 新增种子库视图，以卡片墙形式展示用户所有种子
- 种子支持完整生命周期管理：草稿 → 活跃 → 归档
- 种子卡片支持快捷操作：编辑、发布、归档、删除
- 新增种子创建/编辑 Modal，支持标题、内容（Markdown）、标签输入
- 种子库前端与后端 API 完成联调，实现真实数据的增删改查
- 控制台整体视觉风格遵循设计规范（void 深色背景、bio-green accent、直角卡片、DM Mono 字体）

## Capabilities

### New Capabilities

- `console-layout`：控制台整体布局，包含顶部导航栏、快速操作栏、主内容区框架，作为所有后续控制台子页面的容器
- `seed-repository-page`：种子库页面，包含种子卡片墙视图、状态筛选、搜索、卡片快捷操作等交互逻辑
- `seed-editor`：种子创建/编辑 Modal 组件，支持 Markdown 内容输入、标签管理、草稿保存与直接发布两种模式

### Modified Capabilities

- `design-system`：补充控制台所需的新组件规范——顶部导航栏、快速操作栏、状态筛选 Tabs、空状态占位组件

## Impact

- **新增页面**：`content-forest-front/pages/console/index.vue`（控制台入口，路由 `/console`）
- **新增组件**：
  - `components/console/ConsoleNav.vue`（顶部导航）
  - `components/console/QuickActionBar.vue`（快速操作栏）
  - `components/seed/SeedCardWall.vue`（种子卡片墙）
  - `components/seed/SeedCard.vue`（单个种子卡片）
  - `components/seed/SeedEditor.vue`（种子编辑 Modal）
- **API 联调**：对接后端已有种子接口
  - `GET /api/seeds`（列表，支持状态/标签过滤）
  - `POST /api/seeds/draft`（保存草稿）
  - `POST /api/seeds/publish`（发布种子）
  - `PATCH /api/seeds/:id`（更新种子）
  - `PUT /api/seeds/:id/archive`（归档）
  - `PUT /api/seeds/:id/restore`（回档）
  - `DELETE /api/seeds/:id`（删除）
  - `GET /api/tags`（标签列表，用于自动补全）
- **依赖**：后端种子 API 已实现（`seed-management`、`seed-storage` spec 已完成）
- **路由**：在 Nuxt 路由配置中新增 `/console` 入口，落地页导航栏增加「进入控制台」入口
