# Design: Landing Page Integrations

## 技术方案

### 1. Waitlist API

**路径**: `content-forest-front/server/api/waitlist.post.ts`

**方案**: Nuxt Server Route + 本地 JSON 文件存储

```
POST /api/waitlist
Body: { email: string }
Response: { success: boolean, message: string }
```

存储路径: `content-forest-front/server/data/waitlist.json`
格式:
```json
[
  { "email": "user@example.com", "joinedAt": "2026-03-15T14:00:00Z" }
]
```

**校验规则**:
- email 格式验证
- 重复提交返回 200（幂等）
- 写文件操作加简单文件锁（sequential write）

### 2. Demo 页面

**路径**: `content-forest-front/pages/demo.vue`

**方案**: 静态模拟数据 + 分步动画展示

**流程可视化**:
```
Step 1: 输入种子 (用户可编辑)
   ↓ [Generate 按钮]
Step 2: 加载营养库动画（模拟 500ms）
   ↓
Step 3: 并排展示 3 个果实变体（A/B/C）
   ↓ [Pick Up]
Step 4: 展示选中果实的完整内容
   ↓
Step 5: 展示模拟数据指标（点赞/播放）
```

**数据**: 硬编码 JSON，涵盖 3 种种子类型（AI工具/健身/职场）

### 3. SEO / OG

**方案**: Nuxt `useSeoMeta()` + 静态 OG 图片

- OG 图片: `public/og-image.png` (1200×630)
  使用纯 CSS/SVG 生成，放在 `public/` 目录
- sitemap: `@nuxtjs/sitemap` 模块（自动生成）
- robots.txt: `public/robots.txt`

### 5. UI 精化

**营养库卡片底部动效（方向 B：进度条组）**

当前：`nutrients = [platform, domain, seed_history]`（纯代码，无动效）

替换方案：三层进度条，进入视口时依次从左到右填充（staggered animation），颜色复用系统 accent 色。

```
平台规则   ████████████  实时规则      ← bio-green，延迟 0ms
垂直知识   █████████░░░  领域积累      ← gene-blue，延迟 120ms
历史经验   ██████░░░░░░  越用越准 ↑    ← mutation，延迟 240ms
```

实现细节：
- IntersectionObserver 触发，进入视口后执行一次
- CSS `transition: width 800ms cubic-bezier(0.4, 0, 0.2, 1)`
- 宽度值：平台规则 100%、垂直知识 75%、历史经验 55%（传达「历史经验还在积累中」的动态感）
- 每行结构：`[标签] [进度条] [说明文字]`，font-mono text-xs
- 无 JS 动画库依赖，纯 CSS transition + Vue `ref` 控制 width 赋值

六张卡片底部 snippet 差异化策略：
```
种子 Seed        → 保留代码（建立技术锚点）
营养库 Nutrient  → 进度条组（展示三层结构）← 本次
果实 Fruit       → 保留代码（status 流转直觉）
突变 Mutation    → 点阵频率 ●●○○○○○○○○
Pick Up          → 品味进化条（待后续迭代）
营养汲取         → 保留代码（extract 语义清晰）
```

**IterationTree SVG 自适应**

问题：容器 `height:340px` 写死，移动端宽度缩小后右侧节点（x=760）被裁切。

方案：容器改用 `aspect-ratio: 860/340` 替代固定高度，SVG 高度自动跟随宽度等比缩放。

**Mutation 卡片去代码化**

当前：`mutation_rate: 0.10 // 10% randomness`（冷、技术感强、非目标用户友好）

替换为点阵 + 自然语言方案：
```
突变频率  ●●○○○○○○○○  1/10
防止系统陷入「聪明的局部最优」
```
实现：纯 HTML/CSS，10 个圆点（2个实心 + 8个空心），无需 JS。

### 6. i18n 国际化

**方案：轻量 composable（不引入 @nuxtjs/i18n）**

Landing page 阶段目标是转化，无需 SEO 多语言 URL。

```
composables/
└── useLocale.ts     useState('locale') + t() 函数
locales/
├── zh.ts           中文文案 key-value
└── en.ts           英文文案 key-value
```

切换逻辑：
```ts
const locale = useState('locale', () => 'zh')
const t = (key: string) => locales[locale.value][key] ?? key
```

**不参与国际化的内容**：Hero 打字机代码行、IterationTree 节点标签、font-mono 技术标识符。

**切换 UI**：SiteHeader 右侧加 `ZH / EN` 文字切换，font-mono 风格，无图标。

### 7. 移动端修复

**目标断点**: 375px, 390px (iPhone), 768px (iPad)

**已知问题**:
- HeroSection 粒子在小屏幕性能问题 → 移动端减少粒子数量至 15
- LoopSection 桌面版横向 5 节点 → 移动端已有 tab 切换，需验证
- ConceptsSection 迭代树 ASCII → 移动端需加横向滚动容器
- CompareSection 表格 → 移动端需精简列宽

## 文件变更清单

```
content-forest-front/
├── server/
│   ├── api/
│   │   └── waitlist.post.ts       [新增]
│   └── data/
│       └── waitlist.json          [新增，初始为空数组]
├── pages/
│   └── demo.vue                   [新增]
├── components/
│   ├── CtaSection.vue             [修改，接入真实 API]
│   ├── HeroSection.vue            [修改，移动端粒子优化]
│   └── DemoSeedInput.vue          [新增，Demo 页种子输入组件]
└── public/
    ├── og-image.png               [新增]
    └── robots.txt                 [新增]
```
