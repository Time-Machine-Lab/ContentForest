## Context

内容森林目前只有落地页（`/`）和 Demo 页（`/demo`），缺少实际的产品控制台。后端种子管理 API 已全部实现（`seed-management`、`seed-storage`、`seed-mcp-tools` spec 均已完成），前端尚未有任何与后端联调的页面。

本次变更需要交付：
1. 控制台整体框架（布局 + 导航）
2. 种子库页面（卡片墙 + 增删改查）
3. 前后端联调打通

技术约束：
- 前端框架：Nuxt 3（Vue 3 + TypeScript）
- 样式：Tailwind CSS + 项目设计规范（`design-system` spec）
- 后端：已有 Nuxt Server API，种子 CRUD 接口全部就绪
- SSR：控制台含交互状态机，必须 `definePageMeta({ ssr: false })`

## Goals / Non-Goals

**Goals:**
- 实现 `/console` 路由，作为所有控制台子页面的容器
- 实现种子库卡片墙，支持按状态筛选（草稿/活跃/归档）
- 实现种子的完整 CRUD：创建（草稿/直接发布）、编辑、归档、回档、删除
- 实现种子编辑 Modal，支持 Markdown 内容和标签管理
- 前后端完整联调，使用真实 API 数据
- 遵循 `design-system` 规范：void 深色背景、bio-green accent、直角卡片、DM Mono 字体、无圆角

**Non-Goals:**
- 种子工作区（树状图）—— 后续提案实现
- 果实生成流程 —— 后续提案实现
- 数据看板 —— 后续提案实现
- 用户认证/多用户 —— MVP 阶段固定 `local_admin`
- 移动端深度适配 —— 桌面端优先，响应式基础支持

## Decisions

### 决策 1：路由结构 —— 单页面 + 视图状态切换 vs 子路由

**选择：单页面 + 视图状态切换**

控制台 `/console` 为单一页面，内部通过 `activeView` 响应式状态切换不同视图（种子库、果实管理、数据看板等）。不使用 `/console/seeds`、`/console/fruits` 子路由。

**理由**：
- MVP 阶段视图之间耦合度高，单页切换更快、更流畅
- 避免每个子路由都需要独立的 layout 挂载
- 未来若需要深链接，再拆分子路由（成本低）

**备选方案**：Nuxt 文件路由 `/console/seeds.vue`、`/console/fruits.vue`
- 优点：URL 可分享、浏览器前进后退支持
- 缺点：每次切换有路由跳转，交互感割裂；MVP 阶段过度工程化

---

### 决策 2：状态管理 —— Pinia vs composable vs 组件本地状态

**选择：composable（`useSeedRepository`）**

种子数据逻辑封装在 `composables/useSeedRepository.ts` 中，包含：
- `seeds` ref（当前列表）
- `loading`、`error` 状态
- `fetchSeeds(filter)`、`createSeed()`、`updateSeed()`、`archiveSeed()` 等方法

**理由**：
- MVP 阶段无跨页面共享状态需求，Pinia 引入成本不合算
- composable 天然支持 TypeScript 类型推导，测试友好
- 遵循项目现有模式（已有 `useLocale.ts`）

---

### 决策 3：种子编辑器 —— 全页面 vs Modal

**选择：Modal（全屏遮罩层）**

创建和编辑种子均通过 Modal 完成，不跳转到独立页面。

**理由**：
- 用户在卡片墙快速浏览时，Modal 打开/关闭不打断上下文
- 种子内容相对简短（标题 + Markdown 正文 + 标签），Modal 内空间足够
- 减少路由层级复杂度

**Markdown 编辑器**：使用原生 `<textarea>` + 实时 Markdown 预览（`marked` 库），不引入富文本编辑器（过重）。

---

### 决策 4：API 调用 —— `$fetch` vs `useFetch`

**选择：`$fetch`（封装为 composable 方法）**

所有 API 调用使用 Nuxt 内置的 `$fetch`，在 `useSeedRepository` composable 中统一管理。

**理由**：
- 控制台页面禁用 SSR（`ssr: false`），不需要 `useFetch` 的服务端预取能力
- `$fetch` 更直接，适合用户交互触发的命令式调用
- 统一在 composable 中处理 loading/error 状态

---

### 决策 5：卡片墙布局 —— Masonry vs Grid

**选择：CSS Grid（响应式三列）**

```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5
```

**理由**：
- 种子卡片高度相对统一（标题 + 简介 + 操作按钮），不需要 Masonry 的不等高处理
- CSS Grid 性能更好，无需 JS 计算布局
- 遵循 `design-system` spec 已定义的网格规范

## Risks / Trade-offs

- **[风险] Markdown 预览 XSS**：使用 `marked` 渲染用户输入的 Markdown 存在 XSS 风险
  → 缓解：使用 `marked` + `DOMPurify` 对输出 HTML 进行净化，或使用 `marked` 的 `sanitize` 选项

- **[风险] 种子列表性能**：种子数量大时，一次性加载全部列表会卡顿
  → 缓解：MVP 阶段种子数量有限（个人工具），接口已支持分页（`page`/`size` 参数），前端默认加载前 50 条，后续按需加载

- **[取舍] 无离线草稿**：编辑中的种子内容不自动保存到 localStorage
  → 接受：MVP 阶段手动保存即可，用户刷新页面会丢失未保存内容（有明确提示）

- **[取舍] 无撤销操作**：归档和删除没有撤销功能
  → 缓解：归档支持回档（`restore` API），删除前有确认 Dialog；物理删除 Markdown 文件（后端行为，前端如实展示）

## Migration Plan

1. 在 `content-forest-front/pages/console/index.vue` 创建控制台入口页
2. 开发控制台布局组件（ConsoleNav、QuickActionBar）
3. 开发种子卡片墙（SeedCardWall、SeedCard）
4. 开发种子编辑 Modal（SeedEditor）
5. 开发 `useSeedRepository` composable，对接后端 API
6. 在落地页导航增加「进入控制台」入口链接
7. 本地联调验证所有 CRUD 操作正常

无需数据库迁移，无 breaking change，无回滚风险（纯前端新增页面）。

## Open Questions

- 标签颜色是否需要随机分配不同颜色，还是统一使用 `bio-green` 边框？→ 建议统一 `bio-green`，保持视觉简洁
- 种子卡片是否需要展示「内容摘要」（正文前 N 字）？→ 建议展示前 80 字，帮助用户快速识别种子内容
- 控制台顶部导航是否需要「通知」入口？→ MVP 阶段不需要，预留位置即可
