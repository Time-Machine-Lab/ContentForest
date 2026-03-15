# Spec: Landing Page

## Purpose

内容森林落地页的 UI 结构、组件规范和 SEO 要求。落地页目标是传递品牌调性并引导用户加入候补名单（Waitlist）。

---

## Requirements

### Requirement: Hero Section

落地页顶部 Hero 区域 SHALL 包含品牌标语、副标题、粒子动效背景和主 CTA 按钮。

#### Scenario: 桌面端展示
- **WHEN** 用户在 1024px 以上宽度访问落地页
- **THEN** Hero 区域展示全屏背景、打字机动效代码行、「Request Access」CTA 按钮
- **AND** 粒子数量为 40

#### Scenario: 移动端展示
- **WHEN** 用户在 768px 以下宽度访问落地页
- **THEN** Hero 区域正常展示，粒子数量降至 15 以优化性能
- **AND** 所有文字和按钮在 375px 断点下可读可点击

---

### Requirement: Navigation

导航栏 SHALL 包含品牌 Logo、页面锚点链接和 Demo 页面入口。

#### Scenario: Demo 链接可见
- **WHEN** 用户访问任意页面
- **THEN** 导航栏显示「Demo」链接指向 `/demo`
- **AND** 导航栏在滚动时保持固定（sticky）

---

### Requirement: Concepts Section

概念区 SHALL 通过6张卡片可视化展示核心概念（种子、营养库、果实、突变、Pick Up、营养汲取），底部去代码化。

#### Scenario: 进入视口动效
- **WHEN** 用户滚动页面使概念卡片进入视口
- **THEN** 卡片依次以 fade-in + slide-up 动效出现
- **AND** IntersectionObserver 使用 `data-concept-id` 属性识别各卡片

#### Scenario: 营养库卡片进度条
- **WHEN** 营养库卡片进入视口
- **THEN** 三层进度条（平台规则/垂直知识/历史经验）依次从左到右填充
- **AND** 动效使用 CSS transition，延迟分别为 0ms / 120ms / 240ms

#### Scenario: 突变卡片点阵
- **WHEN** 用户查看突变卡片
- **THEN** 底部展示「●●○○○○○○○○ 1/10」点阵频率，无 JS 依赖

---

### Requirement: Compare Section

对比区 SHALL 展示内容森林与传统内容工具的差异对比表格。

#### Scenario: 移动端表格
- **WHEN** 用户在 768px 以下宽度查看对比表格
- **THEN** 表头文字精简，表格可横向滚动，内容不被截断

---

### Requirement: CTA Section

CTA 区 SHALL 包含邮件输入表单，提交后调用 Waitlist API 并展示反馈状态。

#### Scenario: 成功提交
- **WHEN** 用户输入有效邮件并点击提交
- **THEN** 表单调用 `POST /api/waitlist`
- **AND** 展示成功状态提示
- **AND** 输入框禁用防止重复提交

#### Scenario: 重复提交
- **WHEN** 用户使用已注册邮件再次提交
- **THEN** API 返回 200（幂等）
- **AND** 前端展示「已在候补名单中」提示

#### Scenario: 无效邮件
- **WHEN** 用户输入非法邮件格式并提交
- **THEN** 前端或 API 校验失败
- **AND** 展示格式错误提示，不写入存储

---

### Requirement: SEO & OG

落地页 SHALL 包含完整的 SEO meta 标签和 Open Graph 图片，确保社媒分享预览正常。

#### Scenario: OG 图片分享
- **WHEN** 用户在社媒平台分享落地页链接
- **THEN** 预览展示 `og-image.svg`（1200×630 品牌风格）
- **AND** og:title 和 og:description 正确填充

#### Scenario: 搜索引擎收录
- **WHEN** 搜索引擎爬取落地页
- **THEN** `robots.txt` 允许爬取
- **AND** `sitemap.xml` 包含 `/` 和 `/demo` 两个路由

---

### Requirement: Iteration Tree

迭代树 SVG SHALL 在所有屏幕宽度下正确展示，不裁切节点。

#### Scenario: 移动端自适应
- **WHEN** 用户在小屏幕查看迭代树
- **THEN** 容器使用 `aspect-ratio: 860/340` 等比缩放
- **AND** SVG 视口随容器宽度自动调整，右侧节点不被裁切
