## Why

工作区已经可以浏览内容树、选择果实并发起枝化生长，但已选择果实进入发布验证和数据回流的入口仍是禁用按钮，第一期闭环停在“选择果实”之后。需要在工作区接入发布记录与数据回流交互，让用户能从果实详情中完成“人工发布记录 -> 人为监控 -> 反馈快照”的操作链路。

## What Changes

- 在工作区果实详情卡中接入发布验证能力：仅已选择果实可以创建人工发布记录。
- 新增前端 publication API 客户端，严格使用 `docs/api/publication.yaml` 中的接口：
  - `POST /api/publication-records`
  - `GET /api/fruits/{fruitId}/publication-records`
  - `GET /api/publication-records/{publicationRecordId}`
  - `PATCH /api/publication-records/{publicationRecordId}`
- 在果实详情中展示发布记录列表，支持查看和编辑发布目标、发布凭证、发布备注。
- 在发布记录列表中预留数据回流入口，并在后端反馈接口存在后接入人为监控器挂载与反馈快照能力。
- 新增前端 feedback API 客户端，依赖后端提案 `add-feedback-module` 提供的 `docs/api/feedback.yaml`；在该契约未落地前，任务中标注为依赖后端更新。
- 工作区交互改为“发布记录是数据回流入口”：监控器和数据反馈不直接挂在果实上，而是挂在具体发布记录上。
- 不新增独立发布器管理页面、不做自动发布、不做自动数据抓取、不做固定平台枚举、不修改后端 API 或 SQL 契约。

## Capabilities

### New Capabilities

<!-- 无。该变更扩展现有工作区能力，不新增独立前端能力域。 -->

### Modified Capabilities

- `content-forest-workbench`: 扩展种子工作区的果实详情能力，接入人工发布记录、发布记录列表、发布记录编辑，以及基于发布记录的数据回流入口。

## Impact

- 影响工作区页面：`app/pages/seeds/[seedId]/workspace.vue` 需要从禁用按钮升级为可用的发布记录和数据回流交互。
- 影响前端模块：新增 `src/modules/publication/` API 类型与客户端；后续新增 `src/modules/feedback/` API 类型与客户端。
- 影响 OpenSpec 前端规格：扩展 `content-forest-workbench` 对发布验证和数据回流入口的要求。
- 依赖后端现有发布接口：`docs/api/publication.yaml`。
- 依赖后端新增反馈接口：由后端 `add-feedback-module` 创建 `docs/api/feedback.yaml` 后再完整接入。
- 不影响 SQL、后端接口契约、工作区树快照结构和节点布局持久化规则。
