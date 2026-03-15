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

### 4. 移动端修复

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
