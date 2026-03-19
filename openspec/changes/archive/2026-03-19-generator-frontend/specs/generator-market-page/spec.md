## ADDED Requirements

### Requirement: 生成器市场页面
系统 SHALL 在 `/generators` 路由下提供独立的生成器市场页面。页面 SHALL 禁用 SSR（`definePageMeta({ ssr: false })`）。页面 SHALL 复用首页 `HeroNav` 导航栏和 `SiteFooter`。任何用户（无需登录）均可访问，安装操作使用固定 MVP userId `local_admin`。

#### Scenario: 访问生成器市场
- **WHEN** 用户访问 `/generators`
- **THEN** 页面展示完整市场视图，包含 Hero 区、筛选 Tab、生成器卡片墙
- **AND** 系统自动请求 `GET /api/generators/market`（携带 `X-User-Id: local_admin`）

#### Scenario: 市场加载中
- **WHEN** `GET /api/generators/market` 请求进行中
- **THEN** 卡片区显示 6 个骨架占位卡片（`animate-pulse`）

#### Scenario: 空状态
- **WHEN** 市场没有任何生成器
- **THEN** 显示空状态：`// EMPTY` 前缀（`text-mutation`）、「市场里还没有生成器」标题（`font-serif`）、「上传第一个生成器」CTA 按钮（跳转控制台）

---

### Requirement: 市场 Hero 区
市场页顶部 SHALL 显示 Hero 区，包含：`// Generator Market` 技术前缀、「生成器市场」大标题、副文案「把爆款生产方法论，装进一个文件」、右侧实时统计（生成器总数 · 总安装次数）。

#### Scenario: 统计数据展示
- **WHEN** 市场页加载完成
- **THEN** Hero 区右侧显示「N 个生成器 · M 次安装」统计
- **AND** 数字使用 `text-gene-blue font-mono` 样式

---

### Requirement: 平台筛选 Tabs
市场页 SHALL 提供平台筛选 Tabs：「全部」「小红书」「抖音」「推特」「知乎」「其他」。切换 Tab 时 SHALL 重新请求 API 并传入 `platform` 参数（「全部」不传）。每个 Tab SHALL 显示对应数量 badge。

#### Scenario: 切换平台筛选
- **WHEN** 用户点击「小红书」Tab
- **THEN** 系统请求 `GET /api/generators/market?platform=xiaohongshu`
- **AND** 卡片墙更新，「小红书」Tab 显示激活样式（底部 `2px gene-blue` underline）

#### Scenario: 筛选无结果
- **WHEN** 当前平台筛选下没有生成器
- **THEN** 显示空状态「该平台暂无生成器」

---

### Requirement: 市场生成器卡片
每张市场卡片 SHALL 展示：左侧 `3px gene-blue` accent bar、平台标签（右上角）、官方徽章（官方生成器显示）、生成器名称（`font-serif`）、描述（截断至 2 行）、作者、安装次数（`↓ N 次安装`）、价格（MVP 均显示「免费」）、安装/已安装按钮。

#### Scenario: 展示未安装生成器
- **WHEN** 生成器的 `isInstalled` 为 `false`
- **THEN** 卡片底部显示「安装」按钮（`gene-blue` 边框色）

#### Scenario: 展示已安装生成器
- **WHEN** 生成器的 `isInstalled` 为 `true`
- **THEN** 卡片底部显示「已安装 ✓」状态（`text-bio-green`，不可点击）

---

### Requirement: 安装生成器交互
用户点击「安装」按钮后，系统 SHALL 调用 `POST /api/generators/:id/install`，安装期间按钮 SHALL 显示 loading 态。安装成功后 SHALL 给出路径提示 Toast，方便用户在 AI IDE 中定位 Skill 文件。

#### Scenario: 安装进行中
- **WHEN** 用户点击「安装」按钮
- **THEN** 按钮变为 loading 态（「安装中...」），禁止重复点击

#### Scenario: 安装成功
- **WHEN** `POST /api/generators/:id/install` 返回成功
- **THEN** 按钮变为「已安装 ✓」（`text-bio-green`）
- **AND** Toast 显示「安装成功！Skill 路径：{skillPath}」
- **AND** 安装计数 +1（前端乐观更新）

#### Scenario: 安装失败
- **WHEN** API 返回错误
- **THEN** 按钮恢复「安装」状态
- **AND** Toast 显示「安装失败，请重试」

#### Scenario: 重复安装
- **WHEN** API 返回 409（已安装）
- **THEN** 按钮更新为「已安装 ✓」状态（数据同步修正）
