## MODIFIED Requirements

### Requirement: 侧边栏导航
控制台 SHALL 提供可折叠的左侧边栏导航（展开宽度 `w-56`，折叠宽度 `w-14`）。侧边栏 SHALL 包含：顶部品牌 Logo 区、中部导航菜单、底部用户信息区和折叠按钮。

侧边栏背景 SHALL 为 `bg-void-2/80 backdrop-blur border-r border-bio-green/10`。侧边栏顶部 SHALL 有 `bio-green` 向下渐变光晕增加深度感。

导航菜单项 SHALL 包含 Iconify 图标 + 文字标签。激活态 SHALL 显示左侧 `2px bio-green` accent bar 和 `bg-bio-green/5` 背景。Coming soon 项 SHALL 透明度 40%，`cursor-not-allowed`。

导航菜单项 SHALL 包含以下条目（按顺序）：
- 种子库（`ph:plant`，已激活可用）
- **生成器（`ph:cpu`，现在激活可用，移除 disabled 状态）**
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

面包屑和操作按钮规则（新增生成器视图）：
- 种子库视图：`// Console / 种子库`，右侧显示「+ 新建种子」
- **生成器视图：`// Console / 我的生成器`，右侧显示「+ 上传生成器」**

Header 背景 SHALL 为 `bg-void/60 backdrop-blur border-b border-bio-green/10`。

#### Scenario: 种子库 Header
- **WHEN** 当前视图为种子库
- **THEN** Header 右侧显示「+ 新建种子」按钮
- **AND** 面包屑显示「// Console / 种子库」

#### Scenario: 生成器视图 Header
- **WHEN** 当前视图为生成器
- **THEN** Header 右侧显示「+ 上传生成器」按钮
- **AND** 面包屑显示「// Console / 我的生成器」

#### Scenario: 点击上传生成器
- **WHEN** 用户点击 Header 中的「+ 上传生成器」按钮
- **THEN** 上传生成器 Modal 打开
