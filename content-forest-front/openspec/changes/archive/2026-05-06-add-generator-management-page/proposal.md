## Why

生成器后端能力已经具备导入、查看、启停、重新上传和可选生成器查询契约，前端需要提供一个轻量的生成器管理页面，让用户能够把外部 Skill 作为内容森林的可管理资源使用。当前 `/generators` 仍是占位页面，无法承接第一期“上传生成器并供枝化生长选择”的关键流程。

## What Changes

- 新增生成器管理页面：展示生成器列表、状态筛选、搜索入口和右侧详情面板。
- 新增生成器导入交互：通过页面主操作入口打开导入流程，上传生成器 Skill zip，并要求用户补充名称和描述。
- 新增生成器详情展示：展示生成器名称、描述、启用状态、内容位置、更新时间、Skill Markdown 和 Skill 文件条目。
- 新增生成器管理操作：支持重新上传 Skill、启用生成器和停用生成器。
- 新增前端状态反馈：覆盖列表加载、详情加载、导入失败、重新上传失败、启停失败、空列表等状态。
- 保持生成器管理页边界：不在该页面执行枝化生长，不展示“用于枝化生长”主操作，不编辑 Skill 内容，不修改 API 或 SQL 契约。

## Capabilities

### New Capabilities

- `generator-management-page`: 定义前端生成器管理页面的列表、详情、导入、重新上传、启用、停用、搜索筛选和接口联动行为。

### Modified Capabilities

无。

## Impact

- 影响前端页面：`/generators` 从占位页升级为可用的生成器管理页面。
- 影响前端接口调用：严格使用 `docs/api/generator.yaml` 中的生成器接口，包括 `GET /api/generators`、`POST /api/generators`、`GET /api/generators/{generatorId}`、`POST /api/generators/{generatorId}/enable`、`POST /api/generators/{generatorId}/disable`、`POST /api/generators/{generatorId}/reupload`。
- 影响前端数据展示：展示字段必须来自 `docs/api/generator.yaml` 的 `GeneratorSummary`、`GeneratorDetail` 和错误响应契约，并参考 `docs/sql/generator.sql` 中的系统事实边界。
- 影响设计系统：页面必须遵守 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 风格，采用紧凑暗色工作台、列表加详情面板结构，不引入市场、评分、付费或营销式页面。
- 参考预览稿：`docs/design/previews/generator-module-preview.html`。
