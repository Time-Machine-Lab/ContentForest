# Tasks: Landing Page Integrations

## Waitlist API

- [ ] 创建 `server/data/` 目录，初始化 `waitlist.json` 为空数组 `[]`
- [ ] 实现 `server/api/waitlist.post.ts`：email 格式校验、幂等写入、返回标准响应
- [ ] 修改 `CtaSection.vue`：表单提交调用 `POST /api/waitlist`，展示成功/错误状态
- [ ] 测试：重复提交同一邮件不报错，`waitlist.json` 正确写入

## Demo 页面

- [ ] 创建 `pages/demo.vue`，实现分步流程布局（5步骤状态机）
- [ ] 创建 `components/DemoSeedInput.vue`：种子选择器（3个预设 + 自定义输入）
- [ ] 实现果实生成动画（loading → 3个果实卡片渐入）
- [ ] 实现 Pick Up 交互（选择果实 → 展示详情 → 模拟指标）
- [ ] 在 `HeroNav.vue` 导航中加入 Demo 链接

## SEO / OG

- [ ] 设计并生成 `public/og-image.png`（1200×630，品牌风格）
- [ ] 在 `pages/index.vue` 完善 `useSeoMeta()` 补全 og:image、twitter:card
- [ ] 创建 `public/robots.txt`
- [ ] 安装 `@nuxtjs/sitemap` 并配置自动生成 sitemap

## 移动端优化

- [ ] `HeroSection.vue`：移动端（<768px）粒子数量从 40 减少到 15
- [ ] `ConceptsSection.vue`：迭代树容器加 `overflow-x-auto`
- [ ] `CompareSection.vue`：移动端隐藏 en 副标题列，精简表格宽度
- [ ] 全局测试 375px / 768px 断点下各 Section 布局
