## Why

内容森林第一期需要先建立一个可用的主工作台入口，让用户能从统一的产品工作区进入种子库，并完成种子的创建、查看、编辑、归档和回档闭环。现在后端种子契约已经具备基础接口，前端需要围绕既有契约补齐第一期最小可用体验。

## What Changes

- 新增内容森林主工作台外壳，采用 `docs/spec/DESIGN.md` 定义的 Raycast-inspired Quiet Command Workspace 风格。
- 左侧全局导航只承载主工作台级入口，如种子库、生成器、营养库；不放置“已归档”作为全局入口。
- 新增种子库页面，使用更具识别度的卡片网格呈现种子，并在页面内部提供未归档/已归档视图切换。
- 新增居中 Command Modal 创建种子，要求标题和 Markdown 正文都非空。
- 新增种子右侧详情面板，支持查看 Markdown 正文、内联编辑、保存、归档、回档和进入工作区入口。
- 对接 `docs/api/seed.yaml` 已定义的种子接口，完成创建、列表、详情、编辑、归档和回档流程。
- 仅实现种子模块前端闭环；内容树画布、枝化生长、果实、生成器上传、营养库上传等能力保留为后续变更。
- 前端不得新增或修改 API/SQL 顶层契约；若实现时发现接口缺口，标记为后端契约依赖。

## Capabilities

### New Capabilities

- `content-forest-workbench`: 定义内容森林主工作台外壳、全局导航、命令式视觉风格和页面承载方式。
- `seed-library`: 定义种子库卡片网格、创建 Command Modal、详情面板、归档筛选和种子 API 全流程行为。

### Modified Capabilities

- 无。

## Impact

- 影响前端 Nuxt 应用布局、路由入口、基础 UI 组件、种子模块、API 访问封装和测试。
- 依赖 `docs/spec/DESIGN.md` 与 `docs/spec/前端开发规范文档.md` 的设计和开发约束。
- 依赖 `docs/api/seed.yaml` 中的种子 API 契约。
- 依赖 `docs/sql/seed.sql` 中的种子系统事实结构，仅作为只读建模参考。
- 不修改后端、SQL 文档或 API 文档。
