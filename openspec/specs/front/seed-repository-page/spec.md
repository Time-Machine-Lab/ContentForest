# Seed Repository Page Spec

## Purpose

定义种子库页面的展示、筛选、搜索和卡片快捷操作规范。

## Requirements

### Requirement: 种子卡片墙展示
种子库页面 SHALL 以卡片网格形式展示当前用户的所有种子。网格 SHALL 为响应式布局（`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`）。页面加载时 SHALL 自动请求 `GET /api/seeds?status=active`。

每张卡片 SHALL 展示：标题、状态标签、内容摘要（无摘要时显示 `// 暂无内容摘要`）、标签列表、果实数量、创建时间、快捷操作按钮组。

卡片 SHALL 遵循设计系统规范：左侧 `3px` accent bar、悬停上浮、顶部渐变光线。活跃卡片有 `bg-bio-green/[0.02]` 微色调。卡片网格 SHALL 以 stagger 方式入场（每张 `80ms` 延迟，`animate-fade-up both`）。

#### Scenario: 正常加载种子列表
- **WHEN** 用户进入种子库页面
- **THEN** 系统请求 `GET /api/seeds?status=active`
- **AND** 加载中显示骨架屏（3 个占位卡片，`animate-pulse`）
- **AND** 加载完成后卡片以 stagger 动效依次淡入上浮

#### Scenario: 空状态
- **WHEN** 当前筛选条件下没有种子
- **THEN** 显示空状态占位区，文案根据当前筛选状态变化
- **AND** 活跃列表为空时显示「+ 播下第一颗种子」CTA 按钮

#### Scenario: 加载失败
- **WHEN** 种子列表 API 请求失败
- **THEN** 显示错误提示，包含「重试」按钮

---

### Requirement: 种子库 Hero 区
种子库页面顶部 SHALL 显示页面标识区，包含：左侧 `// Seed Repository` 技术前缀 + 「种子库」大标题，右侧实时三态统计（活跃 N · 草稿 N · 归档 N）。统计数字 SHALL 通过并行请求三个状态的计数获取。

#### Scenario: 实时统计展示
- **WHEN** 种子库页面加载
- **THEN** 右侧统计区显示活跃/草稿/归档各自数量
- **AND** 活跃数量使用 `text-bio-green`，草稿使用 `text-mutation`，归档使用 `text-mist-3`

---

### Requirement: 种子状态筛选
种子库页面 SHALL 提供状态筛选 Tabs（活跃/草稿/归档/全部）。切换 Tab 时 SHALL 重新请求 API。每个 Tab SHALL 显示对应状态的种子数量 badge。

#### Scenario: 切换状态筛选
- **WHEN** 用户点击「草稿」Tab
- **THEN** 系统请求 `GET /api/seeds?status=draft`
- **AND** 列表更新，「草稿」Tab 显示激活样式

#### Scenario: 筛选「全部」
- **WHEN** 用户点击「全部」Tab
- **THEN** 系统请求 `GET /api/seeds`（不带 status 参数）

---

### Requirement: 种子搜索
种子库页面 SHALL 提供搜索框，为前端过滤（不触发新 API 请求），匹配种子标题和标签。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在搜索框输入关键词
- **THEN** 卡片列表实时过滤，仅显示匹配的卡片
- **AND** 无匹配时显示空状态「没有匹配「{关键词}」的种子」

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索框
- **THEN** 列表恢复显示当前 Tab 下的全部种子

---

### Requirement: 种子卡片快捷操作
每张卡片 SHALL 根据种子状态显示不同操作按钮：
- **草稿**：「编辑」「发布」「删除」
- **活跃**：「编辑」「归档」
- **归档**：「回档」「删除」

操作按钮 SHALL 使用 `font-mono text-[10px] tracking-widest uppercase`。

#### Scenario: 发布草稿
- **WHEN** 用户点击草稿卡片「发布」
- **THEN** 系统调用 `POST /api/seeds/publish`，列表刷新，Toast 提示

#### Scenario: 归档活跃种子
- **WHEN** 用户点击活跃卡片「归档」
- **THEN** 系统调用 `PUT /api/seeds/:id/archive`，列表刷新

#### Scenario: 回档归档种子
- **WHEN** 用户点击归档卡片「回档」
- **THEN** 系统调用 `PUT /api/seeds/:id/restore`，列表刷新

#### Scenario: 删除种子确认
- **WHEN** 用户点击「删除」
- **THEN** 显示确认 Dialog：「确认删除「{标题}」？此操作不可撤销。」
- **AND** 用户确认后调用 `DELETE /api/seeds/:id`，卡片移除
- **AND** 用户取消则 Dialog 关闭，不执行删除

#### Scenario: 编辑种子
- **WHEN** 用户点击「编辑」
- **THEN** 种子编辑 Modal 打开，预填充标题、内容、标签
