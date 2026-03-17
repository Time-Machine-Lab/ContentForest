## 1. Composables — API 封装层

- [ ] 1.1 新建 `composables/useMyGenerators.ts`：封装 `GET /api/generators/mine`、`DELETE /api/generators/:id/uninstall`，暴露 `generators`、`loading`、`error`、`fetchMine`、`uninstall` 响应式状态和方法
- [ ] 1.2 新建 `composables/useGeneratorMarket.ts`：封装 `GET /api/generators/market`（支持 `platform` 参数）、`POST /api/generators/:id/install`，暴露 `generators`、`loading`、`error`、`fetchMarket`、`install` 方法，内置 3-4 条 mock 数据供开发阶段使用
- [ ] 1.3 新建 `composables/useGeneratorUpload.ts`：封装 `POST /api/generators/upload`（multipart），暴露 `uploading`、`upload` 方法

## 2. 控制台改动 — 侧边栏 & Header & 路由

- [ ] 2.1 修改 `components/console/ConsoleSidebar.vue`：将 `generators` 导航项（`ph:cpu`，label「生成器」）从 `disabled: true` 改为可用
- [ ] 2.2 修改 `components/console/ConsoleHeader.vue`：新增 `activeView === 'generators'` 分支，面包屑显示「// Console / 我的生成器」，右侧显示「+ 上传生成器」按钮，emit `upload-generator` 事件
- [ ] 2.3 修改 `pages/console/index.vue`：注册 `generators` 视图（引入 `GeneratorView` 组件），监听 `ConsoleHeader` 的 `upload-generator` 事件并传递给 `GeneratorView`

## 3. 我的生成器 — 核心组件

- [ ] 3.1 新建 `components/generator/GeneratorView.vue`：视图容器，包含 Hero 区（`// Generator Hub` 前缀 + 「我的生成器」标题）、筛选 Tabs、`GeneratorCardWall`、`GeneratorDetailPanel`、`GeneratorUploadModal`，管理 `showUploadModal`、`selectedGenerator` 状态
- [ ] 3.2 新建 `components/generator/GeneratorCardWall.vue`：调用 `useMyGenerators`，响应式网格（`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`），stagger 入场动效（每张 80ms 延迟），含骨架屏（3 个 `animate-pulse` 占位）和空状态组件
- [ ] 3.3 新建 `components/generator/GeneratorCard.vue`：展示左侧 `3px gene-blue` accent bar、名称、描述（2 行截断）、平台/类型标签、outputCapabilities 标签列表（`OUTPUT` 前缀）、来源徽章（自建/已安装）、安装时间、「卸载」+「查看详情 →」操作按钮
- [ ] 3.4 实现 `GeneratorCardWall` 筛选 Tabs：「全部」「自建」「已安装」，前端过滤，Tab 激活样式使用底部 `2px gene-blue` underline，显示各 Tab 数量 badge
- [ ] 3.5 实现 `GeneratorCardWall` 空状态：显示 `// EMPTY`（`text-mutation`）、「还没有生成器」（`font-serif`）、说明文字、「去生成器市场」和「上传生成器」两个 CTA 按钮

## 4. 我的生成器 — 详情侧面板

- [ ] 4.1 新建 `components/generator/GeneratorDetailPanel.vue`：右侧滑出面板（`w-96`，`translate-x-full → translate-x-0` 动效），展示完整元数据（名称、描述、平台、内容类型、领域、outputCapabilities、Skill 路径）
- [ ] 4.2 实现详情面板 Skill 路径展示：`font-mono` 等宽，路径过长时分段换行，提供「复制路径」按钮（点击后 Toast 提示「路径已复制」）
- [ ] 4.3 实现详情面板「卸载此生成器」按钮：`death-red` 样式，点击弹出 `ConfirmDialog`（「确认卸载「{名称}」？本地 Skill 文件将被删除。」），确认后调用 `useMyGenerators.uninstall`，成功后关闭面板、刷新卡片墙、Toast 提示「生成器已卸载」
- [ ] 4.4 实现面板关闭逻辑：点击 `[×]` 或按 `Escape` 关闭，主内容区宽度平滑恢复

## 5. 我的生成器 — 上传 Modal

- [ ] 5.1 新建 `components/generator/GeneratorUploadModal.vue`：全屏遮罩（`fixed inset-0 bg-void/80 backdrop-blur-sm z-50`），无圆角，`max-w-2xl`，复用设计系统 Modal 规范
- [ ] 5.2 实现表单字段：生成器名称（必填，最大 60 字符）、描述（多行，最大 200 字符）、适用平台（下拉单选）、内容类型（多选 Tag）、领域分类（下拉单选）、输出能力（Tag 自由输入，`Enter`/`,` 添加，`font-mono` 样式）
- [ ] 5.3 实现 Skill zip 文件上传区：支持拖拽和点击选择，显示文件名和大小，文件类型限制 `.zip`，大小限制 10MB
- [ ] 5.4 实现表单提交：必填校验（名称、平台、内容类型、输出能力、zip 文件）→ 调用 `useGeneratorUpload.upload` → loading 态「上传中...」→ 成功后关闭 Modal、刷新卡片墙、Toast 显示「生成器已发布，Skill 路径：{path}」
- [ ] 5.5 实现 Modal 关闭逻辑：点击关闭按钮或 `Escape` 关闭，表单内容重置

## 6. 生成器市场页

- [ ] 6.1 新建 `pages/generators/index.vue`：禁用 SSR（`definePageMeta({ ssr: false })`），复用 `HeroNav` 和 `SiteFooter`，设置 SEO meta
- [ ] 6.2 新建 `components/generator/MarketView.vue`：包含 Hero 区（`// Generator Market` 前缀 + 「生成器市场」标题 + 副文案 + 统计数字）、`PlatformFilterTabs`、市场卡片墙
- [ ] 6.3 新建 `components/generator/PlatformFilterTabs.vue`：Tab 选项「全部/小红书/抖音/推特/知乎/其他」，切换时 emit `change` 事件，激活样式底部 `2px gene-blue` underline
- [ ] 6.4 新建 `components/generator/MarketCard.vue`：展示左侧 `3px gene-blue` accent bar、平台标签（右上角）、官方徽章、名称（`font-serif`）、描述（2 行截断）、作者、`↓ N 次安装`、价格「免费」、安装/已安装按钮
- [ ] 6.5 实现市场卡片安装交互：调用 `useGeneratorMarket.install`，loading 态「安装中...」，成功后按钮变「已安装 ✓」（`text-bio-green`），Toast 显示「安装成功！Skill 路径：{path}」（含复制按钮），前端乐观更新 installCount +1
- [ ] 6.6 实现市场页平台筛选：监听 `PlatformFilterTabs` change 事件，重新调用 `useGeneratorMarket.fetchMarket(platform)`，「全部」时不传 platform 参数
- [ ] 6.7 实现市场页空状态：`// EMPTY`（`text-mutation`）、「市场里还没有生成器」（`font-serif`）、「上传第一个生成器」CTA 按钮（跳转 `/console`）
- [ ] 6.8 实现市场页骨架屏：加载中显示 6 个 `animate-pulse` 占位卡片

## 7. 首页导航改动

- [ ] 7.1 修改 `components/HeroNav.vue`：新增「产品」下拉菜单触发器，使用 `v-show` + `@mouseenter`/`@mouseleave` 控制显隐，动效 `opacity-0 → opacity-100` + `translate-y-1 → translate-y-0`，`duration-200`
- [ ] 7.2 实现下拉菜单内容：菜单项「生成器市场 → /generators」，`font-mono text-xs tracking-widest uppercase`，背景 `bg-void-2 border border-bio-green/10`

## 8. 集成验证

- [ ] 8.1 验证控制台侧边栏「生成器」导航项可点击，激活态样式正确（`bio-green` accent bar）
- [ ] 8.2 验证「我的生成器」视图完整加载流程：骨架屏 → 卡片墙 stagger 入场 → 筛选 Tab 切换
- [ ] 8.3 验证详情侧面板滑出动效、Skill 路径复制功能、卸载确认流程
- [ ] 8.4 验证上传 Modal 表单校验、zip 文件上传、成功 Toast 含路径信息
- [ ] 8.5 验证生成器市场页：mock 数据正常展示、平台筛选切换、安装按钮 loading → 已安装状态变更
- [ ] 8.6 验证首页导航下拉菜单悬停展开、点击「生成器市场」跳转 `/generators`
