## Why

第二期需要支持图片、视频等多媒体内容进入内容森林。当前果实只通过 Markdown 承载正文，无法稳定挂载生成器产出的图片/视频，也无法让用户在枝化生长时上传媒体作为参考输入。

## What Changes

- 新增媒体资源系统事实和内容存储抽象，媒体文件通过内容访问层保存，数据库只保存资源 meta 与内容位置。
- 新增媒体资源上传、读取和详情接口，前端不接触本机绝对路径。
- 果实支持挂载媒体资源，果实详情返回媒体挂载列表。
- 枝化生长支持 `mediaRefs` 输入，每个引用包含媒体资源和用途说明。
- 工作区快照可返回果实媒体摘要和可引用媒体资源。
- 存储设计必须跨操作系统和存储适配器可迁移，支持本地文件、Linux/macOS/Windows 运行环境和后续 OSS/对象存储。

## Capabilities

### New Capabilities

- `media-asset-management`: 媒体资源上传、读取、存储抽象、访问边界和系统事实管理。

### Modified Capabilities

- `fruit-management`: 果实可挂载媒体资源，果实详情返回媒体列表。
- `branch-growth`: 枝化生长请求支持媒体引用和用途说明。
- `workspace-aggregation`: 工作区快照聚合果实媒体摘要和可引用媒体资源。
- `runtime-filesystem-bootstrap`: 运行时内容目录需要声明媒体资源存储位置。

## Impact

- 顶层文档：`docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林架构设计文档.md`、`docs/design/domain/果实领域模块设计文档.md`、`docs/design/domain/枝化生长领域模块设计文档.md`。
- API 契约：新增 `docs/api/media.yaml`，更新 `docs/api/fruit.yaml`、`docs/api/growth.yaml`、`docs/api/workspace.yaml`。
- SQL 契约：新增 `docs/sql/media.sql`，按需更新 `docs/sql/fruit.sql`、`docs/sql/growth.sql`。
- 后端模块：Media Controller、内容访问层、Fruit 领域、Growth 领域、Workspace 聚合。
- 不实现图片/视频生成工具，不实现视频理解、转写、抽帧或专业素材编辑器。
