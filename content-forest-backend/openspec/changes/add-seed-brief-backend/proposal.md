## Why

第二期需要让用户只用少量种子描述就能启动高质量内容探索。当前种子只有原始 Markdown，枝化生长缺少一份长期可编辑、可复用的创作地图，导致 Agent 在冷启动时容易只做表层改写。

## What Changes

- 新增种子主简报后端能力：用户手动生成、查看、编辑和刷新种子主简报。
- 种子主简报作为种子级系统对象长期存在，正文由内容访问层承载，数据库只维护身份、状态、内容位置和审计信息。
- 工作区快照返回当前种子的简报摘要，供前端展示入口、状态和更新时间。
- 简报生成失败不阻塞枝化生长；后续枝化生长可在没有主简报时降级为直接基于种子生长。
- 更新顶层契约时必须先改 `docs/api/seed.yaml`、`docs/api/workspace.yaml` 和 `docs/sql/seed.sql`，再开发后端代码。

## Capabilities

### New Capabilities

- `seed-brief-management`: 种子主简报的生成、查看、编辑、刷新、内容边界和失败降级规则。

### Modified Capabilities

- `seed-management`: 种子详情与种子领域需要表达种子可拥有一份主简报，但种子原文仍是事实源。
- `workspace-aggregation`: 工作区快照需要聚合种子主简报摘要，供工作区展示与枝化生长入口使用。

## Impact

- 顶层文档：`docs/内容森林第二期开发规划文档.md`、`docs/design/domain/种子领域模块设计文档.md`、`docs/design/内容森林架构设计文档.md`。
- API 契约：`docs/api/seed.yaml`、`docs/api/workspace.yaml`。
- SQL 契约：`docs/sql/seed.sql`。
- 后端模块：Seed Controller、Seed 应用服务、Seed Repository、Workspace 聚合服务、内容访问层、AgentPort 简报生成入口或内置 Agent 能力对接。
- 不改变现有种子创建、归档、回档、工作区只读规则。
