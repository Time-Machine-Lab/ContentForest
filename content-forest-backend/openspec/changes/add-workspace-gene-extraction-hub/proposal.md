## Why

当前基因汲取领域已经具备种子级基因库、汲取提醒、汲取任务、基因建议和正式基因经验能力，但工作区快照只返回可引用基因经验，前端无法从单一后端数据源展示统一的基因汲取提示区。为了让基因汲取回到内容树工作现场，并避免前端在果实详情、发布记录等位置分散推断，需要由后端在工作区聚合阶段提供“基因汲取中心”数据。

## What Changes

- 在工作区快照中增加种子级基因汲取中心数据，包括待处理汲取提醒、待确认基因建议、基因库摘要、可引用正式基因经验统计和可用操作提示。
- 基因汲取中心数据由后端聚合领域事实生成，前端只基于返回数据展示，不自行判断哪些节点需要提示汲取。
- 待处理提醒第一期只来自果实选择和果实淘汰；发布操作不自动发起或生成基因汲取提醒。
- 发布记录和数据反馈只可作为用户显式发起基因汲取时选择的证据来源，不作为自动提醒来源。
- 保持现有基因汲取执行接口不变：用户从工作区统一提示组件发起汲取时，仍调用既有基因汲取任务能力。
- 更新 `docs/api/workspace.yaml`，将工作区快照中的基因汲取中心纳入 Workspace Controller 契约。
- 不新增数据库表，不修改 `docs/sql/*.sql`；继续复用现有 gene、fruit、workspace 聚合数据。

## Capabilities

### New Capabilities

### Modified Capabilities

- `workspace-aggregation`: 工作区快照需要返回由后端驱动的基因汲取中心数据，供前端在统一区域展示提醒、建议和基因库摘要。
- `gene-extraction`: 明确第一期汲取提醒来源边界，发布操作不自动生成汲取提醒，发布记录只可作为用户显式选择的证据来源。

## Impact

- Affected API docs: `docs/api/workspace.yaml` needs a response schema update for `WorkspaceSnapshot`.
- Affected backend modules: workspace aggregation service/controller, gene service read queries, workspace tests.
- Affected frontend dependency: the front-end workbench will consume the new workspace snapshot field instead of scattering gene prompt logic.
- SQL impact: no schema change expected.
- Compatibility: existing gene APIs remain available and unchanged; existing workspace consumers must tolerate the new response field.
