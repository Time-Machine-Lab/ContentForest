# Console Layout Spec

## Purpose

定义内容森林控制台的整体页面布局、路由结构和视图切换行为规范。

## Requirements

### Requirement: 控制台页面入口
控制台 SHALL 在 `/console` 路由下提供统一的管理工作台入口。页面 SHALL 禁用 SSR（`definePageMeta({ ssr: false })`）。未登录用户访问时 SHALL 重定向到首页（MVP 阶段固定用户为 `local_admin`，无需登录态校验）。

#### Scenario: 访问控制台
- **WHEN** 用户访问 `/console`
- **THEN** 系统展示控制台页面，默认显示种子库视图
- **AND** 左侧边栏可见，顶部 header 可见

#### Scenario: 从落地页进入控制台
- **WHEN** 用户点击落地页导航栏中的「进入控制台」链接
- **THEN** 系统跳转到 `/console`

---

### Requirement: 侧边栏导航
控制台 SHALL 提供可折叠的左侧边栏导航（展开宽度 `w-56`，折叠宽度 `w-14`）。侧边栏 SHALL 包含：顶部品牌 Logo 区、中部导航菜单、底部用户信息区和折叠按钮。

侧边栏背景 SHALL 为 `bg-void-2/80 backdrop-blur border-r border-bio-green/10`。侧边栏顶部 SHALL 有 `bio-green` 向下渐变光晕增加深度感。

导航菜单项 SHALL 包含 Iconify 图标 + 文字标签。激活态 SHALL 显示左侧 `2px bio-green` accent bar 和 `bg-bio-green/5` 背景。Coming soon 项 SHALL 透明度 40%，`cursor-not-allowed`。

导航菜单项 SHALL 包含以下条目（按顺序）：
- 种子库（`ph:plant`，已激活可用）
- **生成器（`ph:cpu`，激活可用，无 disabled 状态）**
- 果实管理（`ph:leaf`，disabled）
- 内容工坊（`ph:tree-structure`，disabled）
- 数据看板（`ph:chart-line-up`，disabled）
- 设置（`ph:gear`，disabled）

#### Scenario: 侧边栏渲染
- **WHEN** 控制台页面加载完成
- **THEN** 左侧边栏可见，默认展开，显示品牌 Logo 和导航菜单
- **AND** 「种子库」菜单项默认显示激活态
- **AND** 「生成器」菜单项可点击（无 disabled 样式）

#### Scenario: 折叠侧边栏
- **WHEN** 用户点击底部折叠按钮
- **THEN** 侧边栏宽度从 `w-56` 过渡到 `w-14`，文字标签隐藏，仅显示图标
- **AND** 动效时长 `duration-300`

#### Scenario: 展开侧边栏
- **WHEN** 侧边栏处于折叠态，用户点击折叠按钮
- **THEN** 侧边栏宽度从 `w-14` 过渡到 `w-56`，文字标签重新显示

#### Scenario: 切换至生成器视图
- **WHEN** 用户点击侧边栏「生成器」菜单项
- **THEN** 主内容区切换至生成器视图（`activeView = 'generators'`）
- **AND** 「生成器」菜单项显示激活态（accent bar + 背景色）
- **AND** Header 面包屑更新为「// Console / 我的生成器」

#### Scenario: 点击占位菜单项
- **WHEN** 用户点击标注 disabled 的菜单项
- **THEN** 该菜单项不响应点击（`opacity-40 cursor-not-allowed`）

---

### Requirement: 控制台顶部 Header
控制台主内容区顶部 SHALL 提供 Header 栏（高度 `h-14`，`sticky top-0`）。Header 左侧 SHALL 显示面包屑路径。Header 右侧 SHALL 根据当前视图动态显示上下文操作按钮。

面包屑和操作按钮规则：
- 种子库视图：`// Console / 种子库`，右侧显示「+ 新建种子」
- 生成器视图：`// Console / 我的生成器`，右侧显示「+ 上传生成器」

Header 背景 SHALL 为 `bg-void/60 backdrop-blur border-b border-bio-green/10`。

#### Scenario: 种子库 Header
- **WHEN** 当前视图为种子库
- **THEN** Header 右侧显示「+ 新建种子」按钮
- **AND** 面包屑显示「// Console / 种子库」

#### Scenario: 生成器视图 Header
- **WHEN** 当前视图为生成器
- **THEN** Header 右侧显示「+ 上传生成器」按钮
- **AND** 面包屑显示「// Console / 我的生成器」

#### Scenario: 点击新建种子
- **WHEN** 用户点击 Header 中的「+ 新建种子」按钮
- **THEN** 种子编辑 Modal 打开，处于「新建」模式

#### Scenario: 点击上传生成器
- **WHEN** 用户点击 Header 中的「+ 上传生成器」按钮
- **THEN** 上传生成器 Modal 打开

---

### Requirement: 主内容区
控制台 SHALL 提供主内容区容器，根据 `activeView` 状态动态渲染对应视图组件。主内容区 SHALL 占据 Header 以下全部剩余高度（`flex-1 overflow-y-auto`）。内容区内边距 SHALL 为 `py-8 px-6 md:px-10`，最大宽度 `max-w-6xl mx-auto`。

整体布局 SHALL 为 `flex h-screen overflow-hidden`，左侧边栏 + 右侧主区。背景 SHALL 包含多层光效：左上角 `bio-green` 径向光晕、右下角 `gene-blue` 径向光晕、极低透明度 hex pattern。

#### Scenario: 默认视图
- **WHEN** 用户首次进入控制台
- **THEN** 主内容区显示种子库视图

#### Scenario: 视图切换动效
- **WHEN** 用户切换视图
- **THEN** 新视图以 `opacity-0 → opacity-100` 淡入动效显示，时长 `duration-300`
