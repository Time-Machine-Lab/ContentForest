## Why

工作区内容树在果实数量增多后，已淘汰节点会占用树形空间，影响用户聚焦候选果实和已选择果实。用户需要一个轻量开关，在保留淘汰节点可追溯性的同时，临时隐藏它们并让树形布局自动重排。

## What Changes

- 在工作区 header 操作区新增“隐藏淘汰节点 / 显示淘汰节点”切换按钮。
- 开启隐藏后，内容树画布不展示 `selectionState = eliminated` 的果实节点。
- 关闭隐藏后，已淘汰果实恢复展示，并保持其弱化视觉状态。
- 每次隐藏或展示淘汰节点时，前端 MUST 基于当前可见节点重新整理树形布局，并同步更新连接线。
- 隐藏状态仅为前端运行时视图偏好，不调用后端接口，不修改果实物竞天择状态，不持久化节点坐标。
- 如果当前选中的节点因隐藏淘汰节点而不可见，前端应切换到仍可见的合理节点，优先使用种子根节点。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `content-forest-workbench`: 增加工作区隐藏/展示已淘汰节点的视图过滤与动态树形整理行为。

## Impact

- 主要影响 `app/pages/seeds/[seedId]/workspace.vue` 的工作区 header 操作、节点可见性计算、树形布局输入、连接线计算和选中节点兜底逻辑。
- 不新增或修改后端接口；继续使用现有 `docs/api/workspace.yaml`、`docs/api/fruit.yaml`、`docs/api/growth.yaml`、`docs/api/seed.yaml` 中定义的接口。
- 不新增或修改数据库结构；隐藏状态与整理后的节点坐标均为前端运行时状态。
- 不影响种子库、生成器管理、营养库管理页面。
