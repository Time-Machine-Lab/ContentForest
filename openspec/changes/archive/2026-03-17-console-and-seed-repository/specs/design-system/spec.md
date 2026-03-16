## MODIFIED Requirements

### Requirement: 组件规范
前端设计系统 SHALL 在现有组件规范基础上，补充控制台场景所需的新组件规范。以下为新增组件规范内容（在原有卡片、按钮、标签规范之外新增）：

**顶部导航栏**：
```html
<nav class="sticky top-0 z-40 h-14 flex items-center justify-between
            px-6 bg-void/90 backdrop-blur border-b border-bio-green/10">
```

**快速操作栏**：
```html
<div class="h-12 flex items-center gap-1 px-6
            bg-void-2/60 backdrop-blur border-b border-bio-green/10">
  <!-- 功能 Tab 激活态 -->
  <button class="font-mono text-xs tracking-widest uppercase px-4 h-full
                 text-bio-green border-b-2 border-bio-green">
  <!-- 功能 Tab 默认态 -->
  <button class="font-mono text-xs tracking-widest uppercase px-4 h-full
                 text-slate-400 hover:text-slate-200 transition-colors duration-300">
  <!-- 占位不可用态 -->
  <button class="font-mono text-xs tracking-widest uppercase px-4 h-full
                 text-mist-2 opacity-40 cursor-not-allowed" disabled>
```

**状态筛选 Tabs**：
```html
<div class="flex gap-0 border-b border-bio-green/10 mb-8">
  <!-- 激活态 -->
  <button class="font-mono text-xs tracking-[0.2em] uppercase px-4 py-2
                 text-bio-green border-b-2 border-bio-green -mb-px">
  <!-- 默认态 -->
  <button class="font-mono text-xs tracking-[0.2em] uppercase px-4 py-2
                 text-slate-400 hover:text-slate-200 transition-colors duration-300">
```

**空状态占位**：
```html
<div class="flex flex-col items-center justify-center py-24 gap-4">
  <div class="font-mono text-xs tracking-[0.3em] text-mutation uppercase">// EMPTY</div>
  <p class="font-serif text-xl text-slate-300"><!-- 空状态标题 --></p>
  <p class="font-sans text-sm text-slate-500"><!-- 空状态说明 --></p>
  <!-- 可选 CTA -->
  <button class="font-mono text-sm tracking-widest uppercase px-8 py-3
                 bg-bio-green text-void hover:bg-bio-green/80 transition-all duration-300">
```

**Toast 通知**：
```html
<!-- 固定在页面右上角，z-50 -->
<div class="fixed top-4 right-4 z-50 font-mono text-xs tracking-widest
            px-4 py-3 bg-void-2 border border-bio-green/40 text-bio-green
            animate-in slide-in-from-top-2 duration-300">
```

**确认 Dialog**：
```html
<div class="fixed inset-0 bg-void/80 backdrop-blur-sm z-50 flex items-center justify-center">
  <div class="bg-void-2 border border-bio-green/20 p-8 max-w-sm w-full mx-4">
    <p class="font-sans text-sm text-slate-300 mb-6"><!-- 确认文案 --></p>
    <div class="flex gap-3 justify-end">
      <button class="font-mono text-xs tracking-widest uppercase px-6 py-2
                     border border-bio-green/30 text-slate-400
                     hover:text-slate-200 transition-colors duration-300">取消</button>
      <button class="font-mono text-xs tracking-widest uppercase px-6 py-2
                     bg-death-red/20 border border-death-red/60 text-death-red
                     hover:bg-death-red/30 transition-all duration-300">确认</button>
    </div>
  </div>
</div>
```

#### Scenario: 顶部导航栏视觉规范
- **WHEN** 控制台页面渲染
- **THEN** 顶部导航栏高度为 `h-14`，背景为 `bg-void/90 backdrop-blur`，底部有 `border-b border-bio-green/10` 分隔线
- **AND** 导航栏固定在页面顶部（`sticky top-0`），不随页面滚动

#### Scenario: 空状态占位规范
- **WHEN** 列表为空时渲染空状态组件
- **THEN** 组件居中显示，包含 `// EMPTY` 技术前缀标签（`text-mutation`）、主标题（`font-serif`）、说明文字（`font-sans text-slate-500`）

#### Scenario: Toast 通知自动消失
- **WHEN** 系统显示 Toast 通知
- **THEN** Toast 在 3 秒后自动以淡出动效消失
- **AND** 同一时间最多显示 1 条 Toast，新 Toast 替换旧 Toast
