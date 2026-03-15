# Tasks: Landing Page Integrations

## Waitlist API

- [x] 创建 `server/data/` 目录，初始化 `waitlist.json` 为空数组 `[]`
- [x] 实现 `server/api/waitlist.post.ts`：email 格式校验、幂等写入、返回标准响应
- [x] 修改 `CtaSection.vue`：表单提交调用 `POST /api/waitlist`，展示成功/错误状态

## Demo 页面

- [x] 创建 `pages/demo.vue`，实现分步流程布局（5步骤状态机）
- [x] 实现果实生成动画（loading → 3个果实卡片渐入）
- [x] 实现 Pick Up 交互（选择果实 → 展示详情 → 模拟指标）
- [x] 在 `HeroNav.vue` 导航中加入 Demo 链接
- [ ] 创建 `components/DemoSeedInput.vue`（已内联到 demo.vue，可选独立组件）

## SEO / OG

- [x] 生成 `public/og-image.svg`（1200×630，品牌风格 SVG）
- [x] 在 `pages/index.vue` 完善 `useSeoMeta()` 补全 og:image、twitter:card
- [x] 创建 `public/robots.txt`
- [x] 安装 `@nuxtjs/sitemap` 并配置自动生成 sitemap

## UI 精化

- [x] `IterationTree.vue`：容器改为 `aspect-ratio: 860/340`，修复移动端 SVG 节点被裁切问题
- [x] `ConceptsSection.vue`：全部6张卡片底部去代码化（种子→标签组、营养库→进度条、果实→状态流、突变→点阵、pickup→品味条、汲取→柱状图）
- [x] IntersectionObserver bug 修复（改用 data-concept-id + nextTick）

## 移动端优化

- [x] `HeroSection.vue`：移动端（<768px）粒子数量从 40 减少到 15
- [x] `ConceptsSection.vue`：迭代树容器加 `overflow-x-auto`
- [x] `CompareSection.vue`：移动端表头文字精简
- [x] 全局测试 375px / 768px 断点下各 Section 布局
