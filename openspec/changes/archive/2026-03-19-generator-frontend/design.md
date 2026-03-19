## Context

内容森林前端已完成种子库模块（控制台 + 种子卡片墙 + 编辑 Modal），建立了完整的设计系统（`void` 深色系 + `bio-green` 主色 + DM Mono/Instrument Serif 字体组合）。生成器模块后端 API 已基本完备，前端需要在现有控制台框架内接入「我的生成器」视图，并新增独立的生成器市场页。

**当前状态**：
- 已有：Nuxt 3 + Tailwind、控制台框架（`console/index.vue` + `ConsoleSidebar` + `ConsoleHeader`）、设计系统规范、`ToastNotification`、`ConfirmDialog` 公共组件
- 缺少：生成器相关视图和组件、生成器市场独立页、首页导航下拉菜单

**关键约束**：生成器本身是 Skill 文件包，不可在 Web 端执行。Web 端职责仅限于元数据管理（浏览、上传注册、安装、卸载）。

## Goals / Non-Goals

**Goals:**
- 在控制台内接入「我的生成器」视图（卡片墙 + 详情侧面板 + 上传 Modal）
- 新增 `/generators` 独立市场页（Hero + 平台筛选 + 卡片墙 + 安装交互）
- 解锁控制台侧边栏生成器导航项，新增 Header 上下文操作
- 首页 HeroNav 新增产品下拉菜单，包含生成器市场入口
- 严格复用现有设计系统规范，生成器模块用 `gene-blue` 作视觉区分

**Non-Goals:**
- Web 端生成器执行界面（MVP 阶段由 AI IDE Agent 负责）
- Skill 文件在线编辑器
- 生成器评分、付费功能
- 果实池展示
- 用户登录态（MVP 固定 `local_admin`）

## Decisions

### 决策 1：生成器模块用 `gene-blue` 作 accent，不用 `bio-green`

**决策**：生成器卡片左侧 accent bar、Tab 激活下划线、安装按钮边框均使用 `gene-blue (#0ea5e9)`，而非 `bio-green`。

**理由**：设计系统中 `gene-blue` 定义为辅助色，生成器是种子库的「下游工具层」，用辅助色建立层级感。全局 CTA（Toast、确认按钮）仍用 `bio-green` 保持一致性。

**备选**：全部统一用 `bio-green`。**否决**：两个模块视觉无区分，用户无法快速感知「我在哪个模块」。

### 决策 2：详情面板用右侧滑出（非 Modal）

**决策**：点击「查看详情」后，右侧滑出宽度 `w-96` 的详情面板，主内容区同步压缩；不使用全屏遮罩 Modal。

**理由**：生成器详情是辅助信息，不需要打断用户的卡片浏览状态。侧面板允许用户同时看到卡片列表和详情，体验更流畅。这与种子编辑 Modal（需要全屏专注填写内容）的场景不同。

**备选**：全屏 Modal。**否决**：生成器详情只有元数据展示，无需打断主流程。

### 决策 3：「我的生成器」和「生成器市场」分属控制台和首页，不合并为一个路由

**决策**：「我的生成器」作为控制台内的视图（`activeView === 'generators'`）；「生成器市场」作为独立页面 `/generators`，复用首页 HeroNav。

**理由**：两者受众和心智模型不同——控制台是「管理我已有的工具」，市场是「发现新工具」。拆分路由使二者都可直接链接访问，市场页也无需登录即可浏览。

**备选**：合并为控制台内的 Tab 切换。**否决**：市场页需要对外可访问（无需登录），强制放入控制台内会增加访问门槛。

### 决策 4：市场页使用 Mock 数据作为开发阶段占位，保留空状态

**决策**：MVP 阶段在 `composables/useGeneratorMarket.ts` 中内置 mock 数据数组（3-4 条示例生成器），供开发和演示使用。同时保留空状态 UI，方便后续切换为真实 API 时验证。

**理由**：后端市场数据依赖预置种子数据，前端开发不应被后端数据阻塞。

### 决策 5：composables 层封装 API 调用，组件不直接 fetch

**决策**：新增 `composables/useMyGenerators.ts` 和 `composables/useGeneratorMarket.ts`，封装所有 API 调用、loading/error 状态、数据转换逻辑。组件只消费 composable 暴露的响应式状态和方法。

**理由**：与现有 `composables/useSeedRepository.ts` 保持一致的代码组织规范，便于测试和复用。

### 决策 6：首页 HeroNav 下拉菜单用纯 CSS hover 实现，不引入新依赖

**决策**：产品下拉菜单使用 Vue `v-show` + `@mouseenter`/`@mouseleave` 控制显隐，动效用 Tailwind `transition` 类，不引入 Headless UI 或 Floating UI 等库。

**理由**：菜单项少（当前只有「生成器市场」一项），过度工程化不合适。保持依赖树简洁。

## Risks / Trade-offs

- **[风险] 详情侧面板与卡片墙压缩动效在小屏幕下体验差** → 在 `md` 以下屏幕将侧面板改为底部抽屉（`translate-y` 动效），或降级为全屏 Modal
- **[风险] 上传 zip 文件前端无法校验是否包含 SKILL.md** → 前端仅做文件类型和大小校验（`.zip`，最大 10MB），SKILL.md 存在性由后端返回 400 时前端展示错误信息
- **[Trade-off] Mock 数据** → 市场页视觉效果依赖 mock 数据质量，需要准备 3-4 条代表性示例（不同平台、不同状态），后续接入真实 API 时删除 mock
- **[风险] 安装成功后 Skill 路径 Toast 信息过长** → 路径截断显示，提供「复制路径」小按钮

## Migration Plan

纯前端新增模块，无数据迁移。部署顺序：
1. 新增 composables（`useMyGenerators`、`useGeneratorMarket`）
2. 新增 generator 组件目录
3. 改动 `ConsoleSidebar.vue`、`ConsoleHeader.vue`、`console/index.vue`
4. 新增 `pages/generators/index.vue`
5. 改动 `HeroNav.vue`

## Open Questions

- `ConsoleHeader.vue` 当前的「+ 上传生成器」按钮事件如何跨组件传递到 `GeneratorView` 内的 Modal？建议用 `console/index.vue` 统一管理 Modal 状态，通过 props/emit 下传，与现有 `SeedEditor` 的模式保持一致。
- 「在 AI IDE 中打开 Skill 文件」的交互：MVP 阶段只显示路径文字 + 「复制路径」按钮，不做实际 IDE 跳转。
