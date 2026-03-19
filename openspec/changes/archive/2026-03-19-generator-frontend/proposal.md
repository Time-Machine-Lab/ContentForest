## Why

生成器模块后端 API 已基本完备，但用户目前无法在 Web 端管理自己的生成器，也无法浏览和安装生成器市场中的 Skill 包。前端页面的缺失使整个生成器模块的使用闭环无法建立。

## What Changes

- 新增控制台「我的生成器」视图：展示用户已安装/自建的生成器列表，支持查看详情、卸载
- 新增上传生成器 Modal：填写元数据 + 上传 Skill zip 包，调用 `POST /api/generators/upload`
- 新增生成器详情侧面板：展示 outputCapabilities、Skill 路径等信息
- 新增首页独立生成器市场页（`/generators`）：浏览市场生成器，支持平台筛选、安装/卸载
- 改动控制台侧边栏：解锁「生成器」导航项（当前 disabled）
- 改动首页导航栏：新增下拉菜单，包含「生成器市场」入口

## Capabilities

### New Capabilities

- `my-generators-view`: 控制台内「我的生成器」视图，包含卡片墙、详情侧面板、上传 Modal
- `generator-market-page`: 首页路由下的生成器市场独立页面（`/generators`），包含平台筛选、卡片墙、安装交互

### Modified Capabilities

- `console-layout`: 控制台侧边栏解锁 generators 导航项，console/index.vue 注册新视图
- `landing-page`: 首页 HeroNav 导航栏新增下拉菜单，包含「生成器市场」链接

## Impact

- **前端新增**：`components/generator/GeneratorView.vue`、`GeneratorCardWall.vue`、`GeneratorCard.vue`、`GeneratorDetailPanel.vue`、`GeneratorUploadModal.vue`、`MarketView.vue`、`MarketCard.vue`、`PlatformFilterTabs.vue`
- **前端新增页面**：`pages/generators/index.vue`
- **前端改动**：`components/console/ConsoleSidebar.vue`（解锁 generators 项）、`console/index.vue`（注册视图）、`components/HeroNav.vue`（新增下拉菜单）
- **接口依赖**：`GET /api/generators/mine`、`GET /api/generators/market`、`POST /api/generators/upload`、`POST /api/generators/:id/install`、`DELETE /api/generators/:id/uninstall`
- **不影响**：种子库、营养库、果实模块、MCP Tools
