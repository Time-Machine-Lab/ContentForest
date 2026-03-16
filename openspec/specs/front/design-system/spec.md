# Design System Spec

## Purpose

定义内容森林前端设计系统的视觉规范、组件样式标准和交互模式，确保全局视觉一致性。

## Requirements

### Requirement: 色彩系统
前端 SHALL 使用以下设计系统色板（定义于 `tailwind.config.ts`）：

| Token | Hex | 用途 |
|-------|-----|------|
| `void` | `#050a0e` | 页面主背景 |
| `void-2` | `#0a1520` | 卡片/组件背景 |
| `void-3` | `#0f1f2e` | 悬停/次级背景 |
| `bio-green` | `#00ff9f` | 主色/激活/CTA |
| `gene-blue` | `#0ea5e9` | 辅助/链接 |
| `mutation` | `#f59e0b` | 警告/草稿/强调 |
| `death-red` | `#ef4444` | 危险/错误/删除 |
| `mist` | `#94a3b8` | 次要文字 |
| `mist-2` | `#64748b` | 更次要文字 |
| `mist-3` | `#334155` | 禁用/边框 |

---

### Requirement: 字体系统
前端 SHALL 使用以下字体族：
- `font-mono`：DM Mono — 用于代码、标签、导航、按钮、数字
- `font-serif`：Instrument Serif — 用于页面标题、卡片标题
- `font-sans`：Inter — 用于正文、说明文字

---

### Requirement: 组件规范

**侧边栏**：
```html
<aside class="flex flex-col h-full border-r border-bio-green/10
              bg-void-2/80 backdrop-blur transition-all duration-300
              w-56">
  <!-- 顶部光晕 -->
  <div class="absolute top-0 left-0 right-0 h-32
               bg-gradient-to-b from-bio-green/5 to-transparent" />
```

**侧边栏菜单项激活态**：
```html
<div class="relative flex items-center h-9 px-2
             text-bio-green bg-bio-green/5">
  <span class="absolute left-0 top-1 bottom-1 w-[2px] bg-bio-green" />
  <Icon />
  <span class="ml-3 font-mono text-xs tracking-widest uppercase">菜单标签</span>
</div>
```

**控制台 Header**：
```html
<header class="sticky top-0 z-30 h-14 flex items-center justify-between
               px-6 bg-void/60 backdrop-blur border-b border-bio-green/10">
```

**种子卡片**：
```html
<div class="relative flex flex-col gap-4 p-6 bg-void-2/60 backdrop-blur
             border-t border-r border-b border-bio-green/20
             hover:-translate-y-0.5"
     style="transition: transform 500ms cubic-bezier(0.4,0,0.2,1),
                        border-color 500ms cubic-bezier(0.4,0,0.2,1)">
  <!-- 左侧 accent bar (活跃: bg-bio-green, 草稿: bg-mist-3, 归档: bg-mist-3/30) -->
  <span class="absolute left-0 top-0 bottom-0 w-[3px] bg-bio-green" />
  <!-- 悬停顶部光线 -->
  <span class="absolute top-0 left-[3px] right-0 h-px opacity-0 group-hover:opacity-100
               transition-opacity duration-500"
        style="background: linear-gradient(90deg, rgba(0,255,159,0.6) 0%, transparent 100%)" />
```

**状态筛选 Tabs**：
```html
<div class="flex items-center border-b border-bio-green/10">
  <!-- 激活态 -->
  <button class="relative h-9 px-4 font-mono text-xs tracking-[0.2em] uppercase text-bio-green">
    活跃 <span class="text-[9px] opacity-60">(3)</span>
    <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-bio-green -mb-px" />
  </button>
  <!-- 默认态 -->
  <button class="relative h-9 px-4 font-mono text-xs tracking-[0.2em] uppercase
                  text-slate-400 hover:text-slate-200 transition-colors duration-300">
    草稿 <span class="text-[9px] opacity-60">(0)</span>
  </button>
</div>
```

**空状态占位**：
```html
<div class="flex flex-col items-center justify-center py-24 gap-4">
  <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase">// Empty</div>
  <p class="font-serif text-2xl text-slate-300"><!-- 空状态标题 --></p>
  <p class="font-sans text-sm text-slate-500"><!-- 空状态说明 --></p>
  <button class="font-mono text-xs tracking-widest uppercase px-8 py-3
                  bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300">
    + 播下第一颗种子
  </button>
</div>
```

**Toast 通知**：
```html
<!-- 固定在页面右上角，z-50 -->
<div class="fixed top-4 right-4 z-50 font-mono text-xs tracking-widest
             px-4 py-3 bg-void-2 border border-bio-green/40 text-bio-green
             transition-all duration-300">
  <span class="text-mutation mr-2">//</span>{{ message }}
</div>
```

**确认 Dialog**：
```html
<div class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center">
  <div class="bg-void-2 border border-bio-green/20 p-8 max-w-sm w-full mx-4">
    <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase mb-4">// Confirm</div>
    <p class="font-sans text-sm text-slate-300 leading-relaxed mb-8">确认文案</p>
    <div class="flex gap-3 justify-end">
      <button class="font-mono text-xs tracking-widest uppercase px-6 py-2
                      border border-bio-green/20 text-slate-400 hover:text-slate-200">取消</button>
      <button class="font-mono text-xs tracking-widest uppercase px-6 py-2
                      bg-death-red/20 border border-death-red/60 text-death-red
                      hover:bg-death-red/30 transition-all duration-300">确认删除</button>
    </div>
  </div>
</div>
```

#### Scenario: 侧边栏视觉规范
- **WHEN** 控制台页面渲染
- **THEN** 侧边栏高度撑满屏幕，宽度 `w-56`（展开态）
- **AND** 激活菜单项有左侧 `2px bio-green` 竖条

#### Scenario: Toast 通知自动消失
- **WHEN** 系统显示 Toast 通知
- **THEN** Toast 在 3 秒后自动以淡出动效消失
- **AND** 同一时间最多显示 1 条 Toast

#### Scenario: 空状态占位规范
- **WHEN** 列表为空时渲染空状态组件
- **THEN** 组件居中显示，包含 `// EMPTY` 技术前缀（`text-mutation`）、主标题（`font-serif`）、说明文字（`font-sans text-slate-500`）
