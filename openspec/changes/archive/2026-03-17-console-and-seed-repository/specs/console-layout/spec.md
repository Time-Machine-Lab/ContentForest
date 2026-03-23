## ADDED Requirements

### Requirement: 控制台页面入口
控制台 SHALL 在 `/console` 路由下提供统一的管理工作台入口。页面 SHALL 禁用 SSR（`definePageMeta({ ssr: false })`）。未登录用户访问时 SHALL 重定向到首页（MVP 阶段固定用户为 `local_admin`，无需登录态校验）。

#### Scenario: 访问控制台
- **WHEN** 用户访问 `/console`
- **THEN** 系统展示控制台页面，默认显示种子库视图
- **AND** 顶部导航栏可见，显示品牌 Logo 和用户操作区

#### Scenario: 从落地页进入控制台
- **WHEN** 用户点击落地页导航栏中的「进入控制台」链接
- **THEN** 系统跳转到 `/console`

---

### Requirement: 顶部导航栏
控制台 SHALL 提供固定在页面顶部的导航栏（`position: sticky; top: 0`）。导航栏 SHALL 包含：左侧品牌标识（`Content Forest` 文字 Logo）、中部全局搜索入口（MVP 阶段为占位，不实现功能）、右侧用户操作区（MVP 阶段仅展示用户名 `local_admin`）。

导航栏背景 SHALL 使用 `bg-void/90 backdrop-blur` 实现毛玻璃效果，高度 SHALL 为 `h-14`。

#### Scenario: 导航栏渲染
- **WHEN** 控制台页面加载完成
- **THEN** 顶部导航栏可见，品牌 Logo 文字为 `Content Forest`
- **AND** 导航栏固定在顶部，页面滚动时不随内容滚动

#### Scenario: 导航栏品牌区域点击
- **WHEN** 用户点击导航栏左侧品牌 Logo
- **THEN** 系统跳转到首页 `/`

---

### Requirement: 快速操作栏
控制台 SHALL 在顶部导航栏下方提供快速操作栏，包含当前可用的主要功能入口。MVP 阶段快速操作栏 SHALL 包含以下入口：「种子库」（默认激活）、「果实管理」（占位，不可点击，标注 `// coming soon`）、「数据看板」（占位，不可点击，标注 `// coming soon`）、「+ 新建种子」（CTA 按钮，打开种子编辑 Modal）。

快速操作栏 SHALL 使用 `bg-void-2/60 backdrop-blur border-b border-bio-green/10` 样式，高度 `h-12`。

#### Scenario: 切换主视图
- **WHEN** 用户点击快速操作栏中已激活的功能入口（如「种子库」）
- **THEN** 主内容区切换到对应视图
- **AND** 点击的入口显示激活状态（`text-bio-green border-b-2 border-bio-green`）

#### Scenario: 点击占位入口
- **WHEN** 用户点击标注 `// coming soon` 的功能入口
- **THEN** 该入口不响应点击（`cursor-not-allowed opacity-40`）

#### Scenario: 点击新建种子
- **WHEN** 用户点击「+ 新建种子」按钮
- **THEN** 种子编辑 Modal 打开，处于「新建」模式

---

### Requirement: 主内容区
控制台 SHALL 提供主内容区容器，根据 `activeView` 状态动态渲染对应视图组件。主内容区 SHALL 占据导航栏和快速操作栏以下的全部剩余高度（`flex-1 overflow-auto`）。内容区内边距 SHALL 为 `py-8 px-6 md:px-12`，最大宽度 `max-w-6xl mx-auto`。

#### Scenario: 默认视图
- **WHEN** 用户首次进入控制台
- **THEN** 主内容区显示种子库视图

#### Scenario: 视图切换动效
- **WHEN** 用户切换视图
- **THEN** 新视图以 `opacity-0 → opacity-100` 的淡入动效显示，时长 `duration-300`
