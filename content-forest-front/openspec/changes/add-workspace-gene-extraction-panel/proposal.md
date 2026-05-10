## Why

基因汲取应该发生在内容树工作现场，但不应该分散到果实详情、发布记录或多个零散按钮中。前端需要在工作区提供一个统一的“基因汲取提示 + 操作”组件，并完全以后端返回的工作区基因汲取数据为展示依据。

## What Changes

- 在种子工作区增加统一的“基因汲取提示 + 操作”组件，用于展示待处理提醒、待确认建议、基因库摘要和相关操作入口。
- 组件只消费后端工作区快照中的基因汲取中心数据，不在前端根据果实状态、发布状态自行推断提醒。
- 从统一组件内发起基因汲取、忽略提醒、查看/编辑/确认/放弃基因建议。
- 工作区节点详情不新增分散的基因汲取入口；发布操作不触发基因汲取入口或自动汲取。
- 保留底部枝化生长输入框中的 `@基因库` 引用能力，并在展示上与统一基因汲取组件保持概念一致。
- 不新增全局基因库页签；基因库入口可以在当前种子上下文中出现，可从种子卡片或工作区进入。

## Capabilities

### New Capabilities

### Modified Capabilities

- `content-forest-workbench`: 在种子工作区中增加统一的基因汲取提示与操作组件，并调整工作区对基因库入口和基因汲取操作的展示规则。

## Impact

- Affected frontend page: `app/pages/seeds/[seedId]/workspace.vue`.
- Affected frontend modules: add or extend gene API/types, update workspace snapshot types after backend contract is available.
- Affected API dependency: depends on backend change `add-workspace-gene-extraction-hub` updating `docs/api/workspace.yaml`.
- Route impact: optional seed-scoped gene library entry may link to a future `/seeds/{seedId}/genes`; this change should not require a global sidebar tab.
- SQL impact: none in frontend.
