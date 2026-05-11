## Why

当前基因汲取入口和提示分布得太散，操作感像一个抽屉式工具而不是工作区里的即时决策层。基因库也需要一个更自然的浏览入口，避免继续把它塞进侧边栏或碎片化页面里。

## What Changes

- 将工作区内的基因汲取建议区重构为浮动面板，聚焦当前待处理建议、上下文和操作。
- 提升建议区的信息密度和层级，保证后端驱动的数据能更直接地被理解和处理。
- 为种子卡片补充基因库入口，并提供独立的基因库页面浏览路径。
- 基因库页面沿用已设计的 preview 风格，作为种子级经验浏览页存在。
- 不改变现有后端接口契约，主要调整前端呈现、路由和交互组织方式。

## Capabilities

### New Capabilities
- `gene-library-page`: 独立的种子级基因库页面，用于浏览、筛选和查看基因经验详情。

### Modified Capabilities
- `seed-library`: 需要新增种子卡片上的基因库入口，并调整种子页面中的相关跳转路径。
- `content-forest-workbench`: 需要重构工作区内的基因汲取提示区与操作方式。

## Impact

- 前端页面与组件：工作区、种子卡片、基因库页面和基因汲取建议面板。
- 设计资源：`docs/design/previews/gene-extraction-floating-panel-preview.html`、`docs/design/previews/gene-library-page-preview.html`。
- 前端 OpenSpec：`content-forest-front/openspec/specs/content-forest-workbench/spec.md`、`content-forest-front/openspec/specs/seed-library/spec.md`。
- 路由与页面结构：新增基因库独立页面入口，但不新增全局侧边栏入口。
