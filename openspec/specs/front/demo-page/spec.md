# Spec: Demo Page

## Purpose

`/demo` 页面通过静态模拟数据可视化展示「种子 → 果实」的完整内容生成流程，帮助访客直观感受产品核心价值，无需真实 LLM 调用。

---

## Requirements

### Requirement: 5步状态机流程

Demo 页面 SHALL 以分步状态机展示完整流程，步骤间单向推进。

#### Scenario: 初始状态
- **WHEN** 用户访问 `/demo`
- **THEN** 页面展示 Step 0（种子选择），显示3种预设种子卡片
- **AND** 页面使用 `definePageMeta({ ssr: false })` 禁用 SSR，确保客户端交互正常

#### Scenario: 步骤推进
- **WHEN** 用户完成当前步骤的交互
- **THEN** `step` ref 递增，展示下一步内容
- **AND** 步骤指示器高亮当前步骤

---

### Requirement: 种子选择

Step 0 SHALL 展示3种预设种子供用户选择，每种种子对应不同平台和语气。

#### Scenario: 选择种子
- **WHEN** 用户点击种子卡片
- **THEN** 卡片高亮选中状态
- **AND** 「Generate Fruits →」按钮变为可点击状态

#### Scenario: 生成果实
- **WHEN** 用户点击「Generate Fruits →」
- **THEN** 立即跳转到 Step 2（果实选择），展示对应的3个果实变体
- **AND** `currentFruits` 从 `fruitData[seed.id]` 取值

---

### Requirement: 果实选择

Step 2 SHALL 展示3个果实变体（含1个突变体），用户可 Pick Up 其中一个。

#### Scenario: 果实卡片渲染
- **WHEN** Step 2 激活
- **THEN** 3个果实卡片以 grid 布局展示
- **AND** `fruitCardClass(fruit)` 函数根据选中状态和是否为突变体返回对应样式类
- **AND** 突变体标注「MUTATION」，普通变体标注「Variant A/B/C」

#### Scenario: Pick Up 交互
- **WHEN** 用户选中果实并点击「Pick Up ▲」
- **THEN** 跳转到 Step 3，展示选中果实的完整内容和模拟指标

---

### Requirement: 内容详情与指标

Step 3/4 SHALL 展示选中果实的完整内容、标签、预估触达人数和模拟数据指标。

#### Scenario: 指标展示
- **WHEN** 用户进入 Step 3
- **THEN** 展示果实的 title、body、tags、estReach
- **AND** 展示 metrics 数组中的各项指标（点赞/评论/转发/CTR）
- **AND** 展示 insights 洞察列表

---

### Requirement: 重置流程

用户 SHALL 可以在任意步骤重置回 Step 0 重新体验。

#### Scenario: 重置
- **WHEN** 用户点击「重新来过 ↺」
- **THEN** `step`、`selectedSeed`、`pickedFruit`、`currentFruits` 全部重置为初始值
- **AND** 页面回到种子选择状态

---

### Requirement: 数据覆盖

Demo 数据 SHALL 覆盖3种典型种子类型，每种包含3个果实变体（含1个突变体）。

#### Scenario: 种子类型
- **WHEN** Demo 数据加载
- **THEN** 包含：小红书AI工具（id: ai）、抖音健身计划（id: fitness）、LinkedIn职场（id: career）
- **AND** 每种种子对应3个果实，其中1个标记 `isMutation: true`
