# Spec: Frontend Design System

## Purpose

内容森林前端统一规范。所有新页面、组件、功能开发 SHALL 遵循本文档定义的色彩、字体、间距、动效、组件结构和文件规范。本规范从现有代码库提取，具有最高约束力。

---

## 1. 色彩系统

### 核心色板（CSS Variables）

```css
:root {
  --void:      #050a0e;  /* 主背景，最深层 */
  --void-2:    #0a1520;  /* 卡片/面板背景 */
  --bio-green: #00ff9f;  /* 主 Accent，CTA，成功态 */
  --gene-blue: #0ea5e9;  /* 次 Accent，科技感，数据 */
  --mutation:  #f59e0b;  /* 第三色，突变/标注/section前缀 */
}
```

### Tailwind 色彩用法

| 用途 | Token |
|------|-------|
| 主背景 | `bg-void` |
| 卡片背景 | `bg-void-2/60 backdrop-blur` |
| 主标题 | `text-slate-100` |
| 正文 | `text-slate-400` |
| 辅助说明 | `text-mist-2` |
| 主 Accent | `text-bio-green` / `bg-bio-green` |
| 次 Accent | `text-gene-blue` |
| 强调/突变 | `text-mutation` |
| 危险/死亡突变体 | `text-death-red` / `border-death-red` |

### 禁止色
- 紫色 / 靛蓝 / 蓝紫渐变（`#6366F1`、`#8B5CF6`）
- 纯白背景
- Tailwind 默认色板直接使用

---

## 2. 字体系统

### 字体栈（全局加载，nuxt.config.ts）

```
DM Mono          → code / label / tag / 数字 / 计量
Instrument Serif → 所有标题 h1/h2/h3，支持 italic
Inter            → 正文段落，weight 300/400/500/600
```

### 用法规则

| 场景 | 类名 |
|------|------|
| 页面主标题 | `font-serif text-6xl md:text-8xl` |
| Section 标题 | `font-serif text-4xl md:text-6xl` |
| 卡片标题 | `font-serif text-xl` 或 `text-base` |
| 技术标签/前缀 | `font-mono text-xs tracking-[0.3em] uppercase` |
| 按钮文字 | `font-mono text-sm tracking-widest uppercase` |
| 正文段落 | `font-sans text-sm leading-relaxed` |
| 数据/指标 | `font-mono text-xs` |

### Section 标签约定

每个 section 顶部必须有技术前缀标签，颜色固定 `text-mutation`：
```html
<div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-4">// Section Name</div>
```

---

## 3. 间距与布局

### 页面容器规范

```html
<!-- 全宽 section -->
<section class="py-32 px-6 md:px-12 relative overflow-hidden">
<!-- 主内容区 -->
<div class="max-w-6xl mx-auto">
<!-- 文章/详情页 -->
<div class="max-w-4xl mx-auto">
<!-- Hero 内容 -->
<div class="max-w-5xl mx-auto">
```

### 间距层级

| 层级 | 类名 |
|------|------|
| Section 上下内边距 | `py-32` |
| Section 标题区底部 | `mb-20` |
| 卡片网格间距 | `gap-5` |
| 卡片内边距 | `p-6` |
| 元素组间距 | `mb-4` / `mb-6` / `mb-8` |

### 网格

```html
<!-- 三列 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
<!-- 两列 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
```

---

## 4. 组件规范

### 4.1 卡片

```html
<div class="group relative border bg-void-2/60 backdrop-blur p-6
           hover:border-opacity-80 transition-all duration-500 cursor-default
           border-bio-green/20">
```

- 背景：`bg-void-2/60 backdrop-blur`
- 边框：`border` + 语义色（`/20` 默认，`/60` 悬停/激活）
- **无圆角**（直角是品牌风格，禁止 `rounded-*`）
- 悬停：仅调整 border opacity，禁止 scale
- 过渡：`transition-all duration-500`

### 4.2 按钮

```html
<!-- 主 CTA -->
<button class="font-mono text-sm tracking-widest uppercase px-8 py-3
              bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300">
<!-- 禁用态 -->
<button class="font-mono text-sm tracking-widest uppercase px-8 py-3
              bg-void-3 text-mist-2 cursor-not-allowed" disabled>
```

- 字体：`font-mono tracking-widest uppercase`（强制）
- 主色：`bg-bio-green text-void`
- 无圆角
- 禁用态必须 `cursor-not-allowed`

### 4.3 标签 / Badge

```html
<span class="font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green">标签</span>
```

- `font-mono text-xs`（强制）
- 无圆角
- border 而非填充背景

### 4.4 Section 背景装饰

```html
<section class="relative">
  <div class="absolute inset-0 hex-pattern opacity-50"></div>
  <div class="absolute inset-0 bg-gradient-to-b from-void via-void-3/30 to-void"></div>
  <div class="relative z-10">...</div>
</section>
```

---

## 5. 动效规范

### 过渡时长

| 场景 | 时长 |
|------|------|
| 颜色/透明度 | `duration-300` |
| 卡片悬停 | `duration-500` |
| Scroll reveal | `0.8s ease` |
| 进度条填充 | `800ms cubic-bezier(0.4, 0, 0.2, 1)` |
| Stagger 步长 | `120ms` |

### IntersectionObserver 规范

```ts
// 必须在 nextTick 后注册，避免 SSR 水合冲突
await nextTick()
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = (e.target as HTMLElement).dataset.conceptId
      // 触发动效
    }
  })
}, { threshold: 0.15 })
Object.values(cardRefs).forEach(el => observer.observe(el))
```

- 元素用 `data-concept-id` 标识，不用 template ref 数组
- threshold: `0.15`
- 动效只触发一次（`observer.unobserve(e.target)` 后）

### 禁止项

- `ease-in-out` 线性动画
- `transform: scale()` 悬停
- Framer Motion / Motion 等 JS 动画库
- `window.setTimeout` / `window.*`（用原生 `setTimeout`，页面加 `definePageMeta({ ssr: false })` 或 `nextTick` 包裹）

---

## 6. 图标与媒体

### 图标规范

- 使用 **Iconify**（https://iconify.design）引入 SVG
- 禁止 Emoji 作为功能图标
- 尺寸统一 `w-5 h-5` 或 `w-4 h-4`，viewBox `24x24`
- 颜色通过 `class` 控制，不写 inline fill

### 图片规范

| 用途 | 来源 |
|------|------|
| 占位图 | Picsum Photos（https://picsum.photos） |
| 真实图片 | Pexels（https://www.pexels.com） |
| 插画 | unDraw（https://undraw.co） |
| OG 图片 | SVG 生成，1200x630，放 `public/` |

---

## 7. 文件与目录规范

### 目录结构

```
content-forest-front/
├── pages/              # 路由页面（文件名即路由）
├── components/         # 全局组件（PascalCase 命名）
├── composables/        # 可复用逻辑（use 前缀）
├── assets/css/main.css # 全局样式，仅基础 utilities
├── public/             # 静态资源（og-image、robots、sitemap）
└── server/
    ├── api/            # Nuxt Server Routes
    └── data/           # 本地 JSON 存储（MVP 阶段）
```

### 命名规范

| 类型 | 规则 | 示例 |
|------|------|------|
| 页面 | kebab-case | `demo.vue` |
| UI 组件 | PascalCase | `HeroSection.vue` |
| Composable | use 前缀 camelCase | `useLocale.ts` |
| Server API | 动词.method | `waitlist.post.ts` |
| CSS class | kebab-case | `.section-reveal` |

### 组件结构约定

```vue
<template>
  <!-- 单一根元素 -->
</template>

<script setup lang="ts">
// 1. definePageMeta（页面级）
// 2. useSeoMeta（页面级）
// 3. interface / type 定义
// 4. ref / reactive 声明
// 5. computed
// 6. 辅助函数（在使用它们的 ref 之后定义）
// 7. 事件处理函数（generate/pickup/reset）
// 8. onMounted / lifecycle hooks
</script>
```

**禁止在 template 内写复杂逻辑**：三元嵌套超过2层必须提取为函数。

---

## 8. SSR 规范

### 含交互的页面必须禁用 SSR

```ts
definePageMeta({ ssr: false })
```

适用场景：含状态机、定时器、IntersectionObserver、浏览器 API 的页面。

### 使用浏览器 API

```ts
// 禁止
window.setTimeout(() => { ... }, 1000)

// 正确 - 用 nextTick 包裹
await nextTick()
setTimeout(() => { ... }, 1000)

// 或判断客户端
if (import.meta.client) { ... }
```

### IntersectionObserver

必须在 `onMounted` 或 `nextTick` 后调用，禁止在 setup 顶层直接调用。

---

## 9. 内容风格规范

### 文案原则

- 口语化，像朋友聊天
- 具体化，有数字和场景
- 每句不超过 15 个字
- 可以幽默、自嘲、挑衅
- 禁止 Lorem Ipsum 占位文本
- 禁止高深专业名词和无意义空话

### 中英文混排

- 品牌词保持英文：`Content Forest`、`Seed`、`Fruit`、`Pick Up`、`Mutation`
- Section 技术前缀用英文注释风格：`// Domain Language`
- 用户面向说明用中文

### 审美禁止项

- Hero + 三卡片布局（SaaS 模板化）
- 所有内容完美居中对齐
- 等宽多栏无层次感
- Emoji 作为装饰
- 圆角卡片（与品牌直角风格冲突）

---

## 10. 移动端规范

### 主要断点

```
md: 768px  ← 主要断点
lg: 1024px
```

### 移动端必检项

- [ ] 375px 下所有文字可读，不溢出
- [ ] 宽容器加 `overflow-x-auto`
- [ ] 粒子数量 <768px 时降至 15
- [ ] SVG 容器用 `aspect-ratio` 替代固定高度
- [ ] CTA 按钮触控区域最小 44px

### 常见修复模式

```html
<!-- SVG 自适应 -->
<div style="aspect-ratio: 860/340"><svg viewBox="0 0 860 340"></svg></div>

<!-- 表格滚动 -->
<div class="overflow-x-auto"><table ...></table></div>
```

```ts
// 移动端粒子
const count = (window?.innerWidth ?? 1024) < 768 ? 15 : 40
```
