## MODIFIED Requirements

### Requirement: 首页导航栏
首页导航栏（HeroNav）SHALL 提供主站入口导航。导航栏 SHALL 包含品牌 Logo 区（左侧）和导航链接区（右侧）。

导航链接区 SHALL 包含：
- **「产品」下拉菜单**（新增）：悬停或点击展开，包含以下条目：
  - 生成器市场 → `/generators`
  - （预留更多产品入口）
- 「进入控制台」→ `/console`（保留现有）

下拉菜单 SHALL 使用 `bg-void-2 border border-bio-green/10` 背景，`font-mono text-xs tracking-widest uppercase` 菜单项文字样式。下拉菜单 SHALL 在鼠标离开时自动关闭，动效为 `opacity-0 → opacity-100 translate-y-1 → translate-y-0`。

#### Scenario: 导航栏渲染
- **WHEN** 首页或任何使用 HeroNav 的页面加载
- **THEN** 导航栏右侧显示「产品」下拉触发器和「进入控制台」按钮

#### Scenario: 展开产品下拉菜单
- **WHEN** 用户悬停或点击「产品」触发器
- **THEN** 下拉菜单以 `opacity-0 → opacity-100` + `translate-y-1 → translate-y-0` 动效展开
- **AND** 显示「生成器市场」菜单项

#### Scenario: 跳转生成器市场
- **WHEN** 用户点击下拉菜单中的「生成器市场」
- **THEN** 页面跳转至 `/generators`
- **AND** 下拉菜单关闭

#### Scenario: 关闭下拉菜单
- **WHEN** 用户鼠标移出下拉菜单区域
- **THEN** 下拉菜单以反向动效关闭
