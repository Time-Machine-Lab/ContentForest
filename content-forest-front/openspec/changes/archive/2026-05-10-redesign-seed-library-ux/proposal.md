## Why

当前 `/seeds` 页面已经具备种子列表、详情、创建、编辑、归档、回档和打开工作区能力，但页面仍更像“卡片列表 + 窄侧栏详情”的管理界面。长 Markdown 种子文档被挤在右侧窄栏中，不符合常规阅读逻辑；打开工作区、编辑、归档等动作也缺少清晰层级，容易让高频路径和危险操作混在一起。

本次重构的目标是将种子库升级为面向“灵感种子阅读与管理”的工作台：全面保留 `docs/design/previews/seed-library-redesign-preview.html` 的三栏阅读布局和视觉方向，让用户可以更自然地阅读种子文档、进入工作区、编辑内容和管理归档状态。

## What Changes

- 将 `/seeds` 页面重构为三栏阅读工作台：
  - 左侧种子索引区：搜索、未归档/已归档切换、种子卡片列表。
  - 中央种子阅读器：宽幅 Markdown 阅读区域、吸顶标题和主操作。
  - 右侧信息区：文档目录和系统事实。
- 优化种子 Markdown 阅读体验：
  - 不再把长文档压缩在窄侧栏中阅读。
  - 使用更接近文档阅读的正文宽度、行高、标题层级和内容容器。
  - 从 Markdown 标题生成右侧文档目录，用于快速理解文档结构。
- 优化动作层级：
  - `打开工作区` 作为当前种子最高优先级主操作，固定在阅读器顶部。
  - `编辑` 作为次级图标操作，不与主路径抢占视觉焦点。
  - `归档/回档` 收敛到更多菜单或低干扰管理区，避免危险操作和主操作并列。
- 优化编辑体验：
  - 编辑态从阅读态切换为专门的编辑面板。
  - 保存、取消、字段校验和错误反馈继续复用现有接口与异常提示规则。
- 优化种子卡片扫描体验：
  - 卡片展示标题、摘要、更新时间和状态。
  - 卡片只使用 `SeedSummary` 中已有字段和前端可从 Markdown 派生的展示信息。
- 保持现有 API 契约不变：
  - 继续使用 `docs/api/seed.yaml` 中已有接口。
  - 不新增接口参数、不修改 SQL、不新增后端字段。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `seed-library`: 优化种子库页面的阅读工作台结构、Markdown 阅读体验、种子操作层级、编辑态和归档/回档入口。

## Impact

- 影响前端页面与组件：
  - `app/pages/seeds/index.vue`
  - `app/components/seed/SeedCard.vue`
  - `app/components/seed/SeedDetailPanel.vue`
  - `app/components/seed/SeedCommandModal.vue`（仅在需要统一视觉时调整）
  - `app/assets/styles/workbench.css`
  - 种子库相关测试
- 继续遵守现有接口：
  - `GET /api/seeds`
  - `GET /api/seeds/archived`
  - `GET /api/seeds/{seedId}`
  - `POST /api/seeds`
  - `PATCH /api/seeds/{seedId}`
  - `POST /api/seeds/{seedId}/archive`
  - `POST /api/seeds/{seedId}/restore`
  - `GET /api/seeds/{seedId}/root-node`
- 继续遵守现有数据结构：
  - `docs/sql/seed.sql`
  - `SeedSummary`
  - `SeedDetail`
- 参考预览：
  - `docs/design/previews/seed-library-redesign-preview.html`
