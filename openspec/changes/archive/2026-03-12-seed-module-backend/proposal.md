## Why

内容森林系统的核心价值在于「种子 → 果实」的进化闭环。种子模块（Seed Repository）是整个系统的起点，也是唯一必须由人类深度参与的环节。当前 `content-forest-backend` 已完成基础脚手架搭建，但缺乏核心业务模块的实现。种子模块是所有后续功能（生成器、果实池、营养汲取、迭代树）的数据基础，必须优先落地，才能打通整条业务链路。

## What Changes

- **新增** 种子领域模型（`Seed` 实体、`SeedStatus` 状态枚举、`SeedRepository` 仓储接口）
- **新增** 种子文件存储层（Markdown + YAML Frontmatter 双写策略，路径 `/cf/data/{userId}/seeds/{YYYY}/{seedId}.md`）
- **新增** 种子 Redis 热数据层（Hash 元数据 + ZSet 列表索引，Key 前缀 `cf:u:{userId}:s:{seedId}:meta`）
- **新增** 种子 CRUD REST API（`POST /api/seeds`、`GET /api/seeds`、`GET /api/seeds/:id`、`PATCH /api/seeds/:id`、`DELETE /api/seeds/:id`）
- **新增** 种子状态流转逻辑（`draft` → `active` → `archived`，支持回退）
- **新增** MCP 工具暴露（`create_seed`、`update_seed`、`list_seeds`、`get_seed`），供 AI Agent 通过 MCP 协议调用
- **新增** 用户上下文中间件（`getCurrentUser()` 封装，MVP 固定返回 `local_admin`，为 SaaS 化预留接口）

## Capabilities

### New Capabilities

- `seed-management`：种子的完整生命周期管理，包括创建、查询、更新、归档和删除。支持草稿（Draft）、活跃（Active）、归档（Archived）三态流转。
- `seed-storage`：种子的双层存储实现——Redis 作为热数据层（元数据与状态索引），Markdown 文件作为冷存储层（内容源文件）。两层数据保持最终一致性。
- `seed-mcp-tools`：将种子管理能力通过 MCP（Model Context Protocol）工具暴露给 AI Agent，实现 IDE 内的自然语言驱动操作。

### Modified Capabilities

（无，本次为全新功能模块，不修改现有规格）

## Impact

- **代码层**：
  - `content-forest-backend/src/` — 新增 `domain/seed.ts`（领域模型）、`repositories/seed-repository.ts`（仓储接口）、`repositories/redis-seed-repository.ts`（Redis 实现）、`services/seed-service.ts`（业务逻辑）、`api/seeds.ts`（路由处理器）
  - `content-forest-backend/src/storage/` — 新增文件系统工具（Markdown 读写、路径解析）
  - `content-forest-backend/src/` — 新增 `middleware/user-context.ts`（用户上下文）
- **依赖**：新增 `ioredis`（Redis 客户端）、`gray-matter`（YAML Frontmatter 解析）、`nanoid`（ID 生成）
- **外部服务**：依赖本地 Redis 实例（`localhost:6379`）
- **存储路径**：在本地文件系统中创建 `/cf/data/` 目录结构
- **MCP Server**：在 `content-forest-backend` 中集成 MCP Server，注册种子相关工具
