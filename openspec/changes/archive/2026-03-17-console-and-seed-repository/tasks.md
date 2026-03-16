## 1. 基础设施与路由

- [x] 1.1 在 `content-forest-front/pages/console/` 目录下创建 `index.vue`，配置 `definePageMeta({ ssr: false })`，设置页面 SEO meta
- [x] 1.2 在落地页顶部导航栏增加「进入控制台」链接，跳转到 `/console`
- [x] 1.3 创建控制台布局所需的目录结构：`components/console/`、`components/seed/`、`composables/`

## 2. 控制台布局组件

- [x] 2.1 创建 `components/console/ConsoleNav.vue`：顶部导航栏，包含左侧品牌 Logo（点击跳转 `/`）、右侧用户名展示（固定 `local_admin`），样式 `sticky top-0 h-14 bg-void/90 backdrop-blur border-b border-bio-green/10`
- [x] 2.2 创建 `components/console/QuickActionBar.vue`：快速操作栏，包含「种子库」（默认激活）、「果实管理」（禁用占位）、「数据看板」（禁用占位）Tab，以及右侧「+ 新建种子」CTA 按钮
- [x] 2.3 在 `console/index.vue` 中组合 ConsoleNav + QuickActionBar + 主内容区，实现 `activeView` 响应式状态管理，视图切换时添加 `opacity-0 → opacity-100 duration-300` 过渡动效

## 3. useSeedRepository Composable

- [x] 3.1 创建 `composables/useSeedRepository.ts`，定义 `seeds`、`loading`、`error` 响应式状态，以及 `currentFilter`（status + searchKeyword）
- [x] 3.2 实现 `fetchSeeds(filter?)` 方法：调用 `GET /api/seeds`，支持 status 和 tags 过滤参数
- [x] 3.3 实现 `saveDraft(data)` 方法：调用 `POST /api/seeds/draft`
- [x] 3.4 实现 `publishSeed(data)` 方法：调用 `POST /api/seeds/publish`
- [x] 3.5 实现 `updateSeed(id, data)` 方法：调用 `PATCH /api/seeds/:id`
- [x] 3.6 实现 `archiveSeed(id)` 方法：调用 `PUT /api/seeds/:id/archive`
- [x] 3.7 实现 `restoreSeed(id)` 方法：调用 `PUT /api/seeds/:id/restore`
- [x] 3.8 实现 `deleteSeed(id)` 方法：调用 `DELETE /api/seeds/:id`
- [ ] 3.9 创建 `composables/useTagRepository.ts`，实现 `fetchTags()` 方法调用 `GET /api/tags`，标签列表本地缓存

## 4. 种子卡片墙

- [x] 4.1 创建 `components/seed/SeedCardWall.vue`：包含状态筛选 Tabs（活跃/草稿/归档/全部）、搜索框、骨架屏、空状态组件、卡片网格容器
- [x] 4.2 实现状态筛选 Tabs：点击切换 `activeStatus`，调用 `fetchSeeds` 重新加载，激活 Tab 样式 `text-bio-green border-b-2 border-bio-green`，禁用 Tab `opacity-40 cursor-not-allowed`
- [x] 4.3 实现搜索框：`font-mono text-sm bg-void border border-bio-green/20 focus:border-bio-green/60`，输入时前端过滤 `seeds` 列表（匹配 title 和 tags）
- [x] 4.4 创建 `components/seed/SeedCard.vue`：展示标题、状态标签、标签列表、果实数量、创建时间，以及根据状态动态渲染的快捷操作按钮组
- [x] 4.5 实现 SeedCard 快捷操作逻辑：草稿卡片显示「编辑/发布/删除」，活跃卡片显示「编辑/归档」，归档卡片显示「回档/删除」；各按钮调用对应 composable 方法
- [x] 4.6 实现骨架屏：3 个占位卡片，使用 `animate-pulse bg-void-2/40` 模拟卡片结构
- [x] 4.7 实现空状态组件：包含 `// EMPTY` 技术前缀（`text-mutation`）、主标题（`font-serif`）、说明文字、可选 CTA 按钮，文案根据当前筛选状态动态变化

## 5. 种子编辑 Modal

- [x] 5.1 创建 `components/seed/SeedEditor.vue`：Modal 容器，`fixed inset-0 bg-void/80 backdrop-blur-sm z-50`，内容区 `max-w-3xl bg-void-2 border border-bio-green/20`，无圆角
- [x] 5.2 实现 Modal 打开/关闭动效：`opacity-0 → opacity-100 duration-300`
- [x] 5.3 实现 `Escape` 键监听关闭（`onMounted` 中注册，`onUnmounted` 中注销），点击遮罩层背景关闭
- [x] 5.4 实现「有未保存内容」检测：表单内容与初始值对比，有修改时关闭触发确认 Dialog
- [x] 5.5 实现标题输入框：单行文本，最大长度 100，提交时空值校验，错误态 `border-death-red`
- [x] 5.6 实现内容 Markdown 文本域：`min-h-[240px] font-mono text-sm`，右上角「预览/编辑」切换按钮，预览模式使用 `marked` + `DOMPurify` 渲染并净化 HTML
- [x] 5.7 实现标签输入组件：输入后按 `Enter` 或 `,` 添加标签，标签以 `font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green` 展示，点击 `×` 删除，最多 10 个
- [x] 5.8 实现标签自动补全：输入时从 `useTagRepository` 获取标签列表，下拉展示最多 5 条匹配项
- [x] 5.9 实现底部操作按钮：新建模式显示「保存草稿」（次要按钮）和「发布种子」（主 CTA），编辑模式显示「保存更改」（主 CTA）；提交中显示 loading 状态，禁用按钮防重复提交
- [x] 5.10 实现提交成功后逻辑：关闭 Modal，触发 `fetchSeeds` 刷新列表，显示 Toast 通知

## 6. 全局 UI 工具组件

- [x] 6.1 创建 `components/ui/ToastNotification.vue`：固定右上角，`font-mono text-xs bg-void-2 border border-bio-green/40 text-bio-green`，3 秒后自动淡出消失，同时只显示 1 条
- [x] 6.2 创建 `components/ui/ConfirmDialog.vue`：全屏遮罩确认弹窗，接收 `message` prop，提供「取消」和「确认」按钮，危险操作确认按钮使用 `bg-death-red/20 border-death-red/60 text-death-red`
- [x] 6.3 创建 `composables/useToast.ts`：提供 `showToast(message, duration?)` 方法，供各组件调用

## 7. 前后端联调验证

- [x] 7.1 验证种子列表加载：进入控制台，确认种子卡片墙正常展示后端真实数据
- [x] 7.2 验证新建草稿：点击「+ 新建种子」→ 填写表单 → 「保存草稿」，确认卡片出现在草稿列表
- [x] 7.3 验证发布种子：新建种子点击「发布种子」，确认卡片出现在活跃列表
- [x] 7.4 验证编辑更新：点击「编辑」→ 修改内容 → 「保存更改」，确认卡片内容更新
- [x] 7.5 验证发布草稿：草稿卡片点击「发布」，确认卡片状态变为活跃
- [x] 7.6 验证归档/回档：活跃卡片「归档」→ 确认消失于活跃列表 → 切换到归档列表 → 「回档」→ 确认回到活跃列表
- [x] 7.7 验证删除确认：点击「删除」→ 确认 Dialog 出现 → 确认删除 → 卡片消失；取消删除 → 卡片保留
- [x] 7.8 验证状态筛选：切换活跃/草稿/归档/全部 Tab，确认列表内容随之变化
- [x] 7.9 验证搜索过滤：输入关键词，确认列表实时过滤；清空关键词，确认恢复完整列表
- [x] 7.10 验证标签自动补全：编辑 Modal 中输入标签，确认下拉补全正常出现并可选择

## 8. 控制台布局重构（侧边栏架构）

- [x] 8.1 新建 `components/console/ConsoleSidebar.vue`：可折叠左侧边栏（展开 `w-56` / 折叠 `w-14`），包含 Logo 区、导航菜单区、底部用户信息区，背景 `bg-void-2/80 backdrop-blur border-r border-bio-green/10`
- [x] 8.2 实现侧边栏导航菜单：每个菜单项含 Iconify 图标 + 文字标签，激活态左侧 `2px bio-green` accent bar + `bg-bio-green/5` 背景，未激活悬停 `bg-void-3/60`，Coming soon 项透明度 40% + `cursor-not-allowed`
- [x] 8.3 实现侧边栏折叠/展开：折叠按钮在侧边栏底部，折叠时只显示图标（居中），文字以 `opacity-0 w-0 overflow-hidden` 过渡隐藏，展开/折叠动效 `transition-all duration-300`
- [x] 8.4 重构 `console/index.vue` 布局：移除 `QuickActionBar`，改为 `flex h-screen overflow-hidden` 根容器，左侧 `ConsoleSidebar` + 右侧 `flex flex-col flex-1 overflow-hidden` 主区
- [x] 8.5 新建 `components/console/ConsoleHeader.vue`：主内容区顶部 header（`h-14 border-b border-bio-green/10`），包含左侧面包屑/页面标题、右侧「+ 新建种子」等上下文操作按钮，背景 `bg-void/60 backdrop-blur sticky top-0`

## 9. 背景光效与视觉深度

- [x] 9.1 控制台根背景光效：在 `console/index.vue` 主区添加多层背景——左上角 `bio-green` 径向光晕（`rgba(0,255,159,0.05)`）、右下角 `gene-blue` 径向光晕（`rgba(14,165,233,0.03)`）、极低透明度 `hex-pattern`，用 `::before` 伪元素或绝对定位 div 实现，`pointer-events-none`
- [x] 9.2 侧边栏背景微光效：侧边栏顶部添加 `bio-green` 向下渐变光晕（`from-bio-green/5 to-transparent h-32`），增加空间深度感
- [ ] 9.3 主内容区背景层次：卡片区域容器添加极细的 `inset shadow`，区分内容区与背景层次（`shadow-inner shadow-bio-green/3`）

## 10. SeedCard 视觉升级

- [x] 10.1 卡片左侧 accent bar：根据种子状态在卡片左侧添加 `3px` 竖条——活跃 `bg-bio-green`，草稿 `bg-mist-3`，归档 `bg-mist-3/30`；通过 `border-l-[3px]` 实现，与整体边框配合
- [x] 10.2 卡片悬停上浮动效：hover 时 `translateY(-2px)`，顶部出现 `1px` `from-bio-green/60 to-transparent` 水平渐变线（`::before` 或绝对定位），border 透明度从 `/20` 过渡至 `/60`，`transition: all 500ms cubic-bezier(0.4, 0, 0.2, 1)`
- [x] 10.3 卡片内容摘要：SeedCard 添加内容摘要展示（正文前 80 字），无摘要时显示 `font-mono text-xs text-mist-3 italic` 的「// 暂无内容摘要」占位；摘要需在 `fetchSeeds` 列表接口不返回 content 时通过 `fruitCount` 等现有字段占位，待种子详情接口支持后补全
- [x] 10.4 活跃卡片特殊光效：活跃状态卡片背景添加极轻微 `bg-bio-green/[0.02]` 色调，区别于草稿和归档卡片，增强状态感知

## 11. SeedCardWall 页面感升级

- [x] 11.1 页面 Hero 区重设计：标题区改为左侧「// Seed Repository」前缀 + 「种子库」大标题 + 右侧实时统计 badge（活跃 N · 草稿 N），统计数字使用 `font-mono text-xs` + `text-bio-green`/`text-mutation` 区分
- [x] 11.2 状态 Tab 升级带数量 badge：每个 Tab 后附加种子数量，如「活跃 (3)」，数量从 `seeds.value.length` 和各状态缓存计算，切换 Tab 时数量更新
- [x] 11.3 卡片网格入场动效：卡片列表加载完成后，各卡片以 stagger 方式依次淡入上浮（`animation-delay` 步长 `80ms`，`fadeUp 0.5s ease-out forwards`），使页面有生命感而非瞬间弹出
