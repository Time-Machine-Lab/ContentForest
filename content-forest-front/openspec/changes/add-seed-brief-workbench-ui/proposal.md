## Why

第二期需要让用户在工作区中看到并维护种子主简报，从而用较少的种子输入启动更高质量的内容探索。前端需要提供手动生成、查看、编辑和刷新入口，但不能把简报变成阻塞枝化生长的前置步骤。

## What Changes

- 在种子工作区展示种子主简报入口和状态。
- 支持用户手动生成、查看、编辑和刷新种子主简报。
- 主简报作为工作区轻量侧栏或面板展示，不遮挡内容树和枝化输入框。
- 未生成主简报时展示轻量空态和生成入口；生成失败时展示失败反馈但允许继续枝化生长。
- 前端严格依赖后端 `add-seed-brief-backend` 更新后的 `docs/api/seed.yaml` 与 `docs/api/workspace.yaml`，不私自定义接口或数据结构。

## Capabilities

### New Capabilities

- `seed-brief-workbench-ui`: 工作区内种子主简报的生成、查看、编辑、刷新和空态展示。

### Modified Capabilities

- `content-forest-workbench`: 工作区需要消费主简报摘要并提供侧栏/面板交互。

## Impact

- 前端页面：种子工作区页面、右侧详情或侧栏区域、工作区状态管理、API client。
- 依赖接口：`docs/api/seed.yaml` 中的种子主简报接口、`docs/api/workspace.yaml` 中的主简报摘要。
- 设计约束：继续遵循 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 风格。
- 不修改 SQL，不修改 API 契约。
