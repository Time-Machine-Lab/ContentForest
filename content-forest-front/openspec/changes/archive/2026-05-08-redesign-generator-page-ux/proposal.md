## Why

当前 `/generators` 页面已经具备生成器导入、浏览、详情、重传、启停等基础能力，但导入流程不够顺手，文件上传缺少拖拽体验和局部提示；生成器浏览也偏列表化，扫描、筛选和查看详情的效率不高。

本次重构的目标是把生成器页面升级为更清晰的资源工作台：导入更像一个可感知状态的 Skill Drop Lab，浏览更像可快速扫描的生成器矩阵，同时继续遵守当前 Quiet Command Workspace 设计系统。

## What Changes

- 重构 `/generators` 页面信息架构为「导入区 + 浏览区 + 详情区」的工作台结构。
- 优化导入生成器体验：
  - 支持 Skill zip 拖拽上传与点击选择上传。
  - 上传区域展示文件选中、拖拽悬停、导入中、缺失字段等局部状态。
  - 名称、描述、zip 缺失时在对应区域给出明确提示，而不是只显示笼统错误。
- 优化生成器浏览体验：
  - 将生成器列表升级为更易扫描的卡片矩阵或密集卡片列表。
  - 在卡片中清晰展示名称、描述、启停状态、内容位置/更新时间等既有信息。
  - 保留按启用状态筛选和按名称/描述搜索的现有能力。
- 优化生成器详情体验：
  - 右侧详情区按 Skill 概览、文件条目、系统事实、操作区组织内容。
  - 详情区保持重传、启用、停用等管理操作，不引入枝化生长入口。
- 视觉风格采用当前设计系统内的高级深色工作台风格，允许参考 preview 中的「生成器铸造台」结构，但颜色、圆角、密度和组件语义必须回归 `docs/spec/DESIGN.md`。
- 不修改后端 API、SQL 或生成器领域语义。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `generator-management-page`: 优化生成器管理页的导入、浏览、详情和反馈体验，要求页面结构更易用，并支持拖拽上传 Skill zip。

## Impact

- 影响前端页面与组件：
  - `app/pages/generators/index.vue`
  - `app/components/generator/GeneratorImportModal.vue`
  - `app/components/generator/GeneratorReuploadModal.vue`
  - `app/components/generator/GeneratorDetailPanel.vue`
  - `app/composables/useGeneratorManagement.ts`
  - 相关全局样式文件
- API 继续使用 `docs/api/generator.yaml` 中既有接口：
  - `GET /api/generators`
  - `GET /api/generators/{generatorId}`
  - `POST /api/generators`
  - `POST /api/generators/{generatorId}/reupload`
  - `POST /api/generators/{generatorId}/enable`
  - `POST /api/generators/{generatorId}/disable`
- 数据结构继续遵守 `docs/sql/generator.sql`，不新增字段、不修改表结构。
- 参考设计稿：
  - `docs/design/previews/generator-page-redesign-preview.html`
