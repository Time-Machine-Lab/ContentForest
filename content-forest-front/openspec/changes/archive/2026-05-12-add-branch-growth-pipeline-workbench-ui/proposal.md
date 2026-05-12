## Why

第二期枝化生长需要让用户感知“本轮在怎么探索”，而不是只看到一个提交按钮和 loading。前端需要展示系统推荐的搜索模式、用户可切换的突变激进程度、果实方向标签和生成中路径图。

## What Changes

- 在枝化生长输入框高级设置中展示搜索模式与突变激进程度。
- 支持系统推荐默认值，用户可切换搜索模式和突变激进程度。
- 发起枝化生长时将搜索模式和突变激进程度映射到 `docs/api/growth.yaml`。
- 轮询生成中任务时展示临时生成路径图。
- 内容树和果实详情展示果实方向摘要或探索标签。
- 前端严格依赖后端 `architect-branch-growth-pipeline-backend` 更新后的 `docs/api/growth.yaml` 与 `docs/api/workspace.yaml`，不私自定义接口。

## Capabilities

### New Capabilities

- `branch-growth-pipeline-workbench-ui`: 工作区枝化生长管线控制、突变激进程度、方向标签和生成路径图展示。

### Modified Capabilities

- `content-forest-workbench`: 工作区枝化输入框、生成中节点、轮询任务和果实详情需要展示管线相关信息。

## Impact

- 前端页面：种子工作区内容树、底部枝化输入框、高级设置、生成中节点、任务轮询逻辑、果实详情。
- 依赖接口：`docs/api/growth.yaml` 中的管线参数和路径图响应，`docs/api/workspace.yaml` 中的方向摘要或果实生成信息。
- 不修改 SQL，不修改 API 契约。
