## Why

果实（Fruit）是内容森林的核心产出物，现有后端已实现种子（Seed）和生成器（Generator）模块，但缺少果实的持久化、状态管理和成长数据能力，导致 Agent 生成的内容无处落库，整条「种子 → 生成 → 选品 → 发布」链路无法跑通。

## What Changes

- 新增 `Fruit` 领域模型，支持容器化设计（固定系统字段 + 自由 payload）
- 新增 `FruitGrowthData` 独立实体，承载发布后的平台数据指标（读时模式）
- 新增平台指标字典静态常量，通过 API 下发给前端
- 新增 `FruitRepository` + `FruitGrowthRepository` 接口及 Redis 实现
- 新增 `FruitService` 业务层，封装状态机流转与 `fruitCount` 原子维护
- 新增 8 个 HTTP RESTful 接口（查询、选品、发布、堆肥、修剪、指标读写、字典）
- 新增 5 个 MCP Tools（批量存果实、获取上下文、更新状态、快捷选品、堆肥）
- 注册新路由和错误类型到 `server.ts`

## Capabilities

### New Capabilities

- `fruit-lifecycle`: 果实的创建、状态机流转（generated → picked → published / rejected）与持久化存储
- `fruit-growth-data`: 果实成长数据（Metrics）的独立存储、读取与更新，支持读时模式的自描述指标
- `fruit-mcp-tools`: Agent 通过 MCP 协议批量写入果实、获取上下文、更新状态、执行选品与堆肥
- `platform-metrics-dict`: 平台指标字典静态常量及 HTTP 下发接口

### Modified Capabilities

- `seed`: 种子实体已有 `fruitCount` 字段，果实模块写入时需原子更新此计数（行为变更，非破坏性）

## Impact

- **新增文件**：`src/domain/fruit.ts`、`src/domain/platform-metrics-dict.ts`、`src/repositories/fruit-repository.ts`、`src/repositories/fruit-growth-repository.ts`、`src/repositories/redis-fruit-repository.ts`、`src/repositories/redis-fruit-growth-repository.ts`、`src/services/fruit-service.ts`、`src/api/fruits.ts`、`src/mcp/fruit-tools.ts`
- **修改文件**：`src/api/server.ts`（挂载新路由和错误类型）、`src/mcp/server.ts`（注册 MCP fruit tools）
- **Redis Key 新增**：`cf:u:{userId}:fruit:{fruitId}`（Hash）、`cf:u:{userId}:seed:{seedId}:fruits`（ZSet）、`cf:u:{userId}:fruit:{fruitId}:growth`（Hash）
- **依赖**：无新增 npm 依赖，复用现有 Redis client、Hono、Zod、nanoid
- **不含**：营养库（Nutrients）实装、Markdown 文件备份、多父节点 DAG（均为二期）
