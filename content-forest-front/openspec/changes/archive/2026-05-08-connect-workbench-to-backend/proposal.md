## Why

当前工作区页面仍以 Mock 数据模拟内容树、节点详情、物竞天择和枝化生长，无法承接后端已完成的工作区聚合、果实和生长任务能力。现在需要把第一期工作区从交互预览推进到可真实读取和驱动业务闭环的前端入口。

## What Changes

- 将种子工作区的数据来源从本地 Mock 切换为 `GET /api/seeds/{seedId}/workspace` 工作区快照。
- 工作区根据快照中的节点和边构建运行时内容树布局，节点拖拽位置仍仅保留在前端运行时，不做持久化。
- 点击种子或果实节点时，分别通过种子详情和果实详情接口读取 Markdown 正文并展示在详情卡片中。
- 果实选择、淘汰、恢复候选操作改为调用果实接口，并在成功后刷新或同步工作区状态。
- 枝化生长改为调用生长任务接口，前端展示节点生长中状态，轮询任务结果，并在完成或失败后刷新工作区快照。
- 工作区输入框的生成器、营养库引用、基因引用来自工作区快照资源，并映射到生长任务请求。
- 增加工作区加载、空树、接口失败、任务失败和最近失败输入恢复等前端状态。
- 不修改 `docs/api/*.yaml` 和 `docs/sql/*.sql`，本次只消费既有接口契约。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `content-forest-workbench`: 工作区从 Mock 交互升级为基于后端工作区快照、果实详情和生长任务接口的真实前端业务交互。

## Impact

- 影响前端工作区页面：`app/pages/seeds/[seedId]/workspace.vue`。
- 新增或调整前端 API 模块：工作区、果实、枝化生长相关接口封装。
- 影响现有工作区交互测试和 API 封装测试。
- 依赖既有 API 文档：`docs/api/workspace.yaml`、`docs/api/fruit.yaml`、`docs/api/growth.yaml`、`docs/api/seed.yaml`。
