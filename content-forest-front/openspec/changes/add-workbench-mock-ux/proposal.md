## Why

当前种子工作区仍是占位页面，无法承载第一期核心的内容树浏览、果实详情、物竞天择和枝化生长体验。需要先基于已确认的 HTML Preview 落地一版前端 UI/UX 与 mock 交互，为后续接入真实后端、Agent 和生长任务打下可体验的产品骨架。

## What Changes

- 将 `app/pages/seeds/[seedId]/workspace.vue` 从占位页升级为可交互的种子工作区原型页面。
- 从种子库入口进入工作区后，前端使用 mock 数据加载当前种子、果实节点和父子关系，构建内容树画布。
- 工作区提供深色全屏画布、左侧导航延续、顶部种子上下文、右侧种子/果实详情面板和底部枝化生长输入框。
- 内容树节点区分种子、候选果实、已选择果实、已淘汰果实、生成中/失败提示等视觉状态。
- 内容树连接线必须基于 mock 父子关系动态绘制，节点拖拽后连接线实时更新。
- 点击节点后展示详情面板；只有已选择果实才显示底部枝化生长输入框。
- 物竞天择操作使用 mock 状态更新：候选果实显示选择/淘汰，已选择果实不显示操作按钮，已淘汰果实只显示恢复。
- 枝化生长输入框以 Codex 风格命令输入面板呈现，生成器和果实数量为只读 mock 信息，不提供修改能力。
- 输入框支持 `@` 资源引用的视觉高亮，并可在枝化生长详情小面板中展示已引用的营养库和基因库资源。
- 点击生长按钮以 mock 方式模拟生长动画和新果实生成，不调用后端、不创建真实数据、不触发真实 Agent。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `content-forest-workbench`: 补充种子工作区 UI/UX、mock 内容树、节点详情、物竞天择、枝化生长输入框和动态树边交互要求。

## Impact

- 影响前端工作区页面：`app/pages/seeds/[seedId]/workspace.vue`。
- 可能新增工作区相关组件、mock 数据、组合逻辑和局部样式，建议放入 `src/modules/workspace`、`src/modules/fruit`、`src/modules/growth` 或通用 canvas 组件目录。
- 不新增、不修改后端 API；本次实现暂不调用真实接口。
- Mock 数据结构应参考 `docs/api/seed.yaml`、`docs/api/fruit.yaml`、`docs/sql/seed.sql`、`docs/sql/fruit.sql` 中已有的种子、果实、父节点和物竞天择状态语义。
- 不修改 `docs/api`、`docs/sql` 或后端实现。
