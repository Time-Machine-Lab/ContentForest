## 1. 依赖安装与基础配置

- [x] 1.1 在 `content-forest-backend/package.json` 中添加依赖：`ioredis`、`gray-matter`、`nanoid`、`@modelcontextprotocol/sdk`
- [x] 1.2 执行 `npm install` 安装依赖
- [x] 1.3 在 `tsconfig.json` 中确认 `paths` 别名配置，新增 `@/` 指向 `src/`
- [x] 1.4 创建 `src/config.ts`，统一管理配置项（Redis 连接地址、`CF_DATA_ROOT` 数据根目录、默认用户 ID `local_admin`）

## 2. 领域模型与接口定义

- [x] 2.1 创建 `src/domain/seed.ts`，定义 `SeedStatus` 枚举（`draft | active | archived`）和 `Seed` 接口
- [x] 2.2 在 `src/domain/seed.ts` 中定义合法状态流转映射表 `VALID_TRANSITIONS`
- [x] 2.3 创建 `src/repositories/seed-repository.ts`，定义 `SeedRepository` 接口（`create`、`update`、`findById`、`list`、`archive`、`delete`）
- [x] 2.4 创建 `src/middleware/user-context.ts`，实现 `getCurrentUser()` 函数（MVP 固定返回 `local_admin`）

## 3. 文件系统存储层

- [x] 3.1 创建 `src/storage/file-storage.ts`，实现路径计算函数 `getSeedFilePath(userId, seedId, createdAt)`
- [x] 3.2 在 `src/storage/file-storage.ts` 中实现 `ensureDir(path)` 工具函数（目录不存在时自动创建）
- [x] 3.3 在 `src/storage/file-storage.ts` 中实现 `writeSeedFile(userId, seed)`：生成 YAML Frontmatter + Markdown 内容并写入文件
- [x] 3.4 在 `src/storage/file-storage.ts` 中实现 `readSeedFile(userId, seedId, createdAt)`：读取并解析 Markdown 文件，返回 Frontmatter + 正文
- [x] 3.5 在 `src/storage/file-storage.ts` 中实现 `deleteSeedFile(userId, seedId, createdAt)`：删除对应文件

## 4. Redis 存储层

- [x] 4.1 创建 `src/storage/redis-client.ts`，初始化 `ioredis` 客户端，连接配置从 `config.ts` 读取
- [x] 4.2 创建 `src/repositories/redis-seed-repository.ts`，实现 `SeedRepository` 接口
- [x] 4.3 实现 `create` 方法：使用 Pipeline 原子性写入 Hash（`cf:u:{userId}:s:{seedId}:meta`）和 ZSet（`cf:u:{userId}:seeds:list`）
- [x] 4.4 实现 `findById` 方法：从 Redis Hash 读取元数据
- [x] 4.5 实现 `list` 方法：从 ZSet 分页获取 ID 列表，MGET 批量获取 Hash，内存中按 status/tags 过滤
- [x] 4.6 实现 `update` 方法：按更新字段类型选择性更新 Redis Hash 字段
- [x] 4.7 实现 `delete` 方法：删除 Hash Key 并从 ZSet 中移除 seedId

## 5. 业务服务层

- [x] 5.1 创建 `src/services/seed-service.ts`，注入 `SeedRepository` 和文件存储依赖
- [x] 5.2 实现 `SeedService.create(userId, dto)`：生成 ID、同步双写 Redis 和文件，返回新种子
- [x] 5.3 实现 `SeedService.findById(userId, seedId)`：合并 Redis 元数据和文件内容，返回完整 Seed
- [x] 5.4 实现 `SeedService.list(userId, filter, pagination)`：调用 Repository list 方法，返回分页结果
- [x] 5.5 实现 `SeedService.update(userId, seedId, updates)`：校验状态流转合法性，按字段类型分派更新操作
- [x] 5.6 实现 `SeedService.delete(userId, seedId)`：同步删除 Redis 数据和文件，种子不存在时返回 404 错误

## 6. REST API 路由

- [x] 6.1 创建 `src/api/seeds.ts`，注册以下路由到 Express/Fastify 路由器
- [x] 6.2 实现 `POST /api/seeds` 处理器：从请求体读取 `title`、`content`、`tags`，调用 `SeedService.create()`，返回 `{ code: 0, data: { id } }`
- [x] 6.3 实现 `GET /api/seeds` 处理器：从 Query 读取分页和过滤参数，调用 `SeedService.list()`，返回 `{ code: 0, data: { list, total } }`
- [x] 6.4 实现 `GET /api/seeds/:id` 处理器：调用 `SeedService.findById()`，种子不存在时返回 HTTP 404
- [x] 6.5 实现 `PATCH /api/seeds/:id` 处理器：调用 `SeedService.update()`，状态流转非法时返回 HTTP 400
- [x] 6.6 实现 `DELETE /api/seeds/:id` 处理器：调用 `SeedService.delete()`，返回 HTTP 200 或 404
- [x] 6.7 在 `src/api/server.ts` 中挂载种子路由，添加 `X-User-Id` 请求头解析中间件

## 7. MCP Server 集成

- [x] 7.1 创建 `src/mcp/seed-tools.ts`，定义 `create_seed`、`list_seeds`、`get_seed`、`update_seed` 四个 MCP 工具的 Schema（参数名、类型、required 约束）
- [x] 7.2 在 `src/mcp/seed-tools.ts` 中实现各工具的 handler，调用 `SeedService` 对应方法
- [x] 7.3 创建 `src/mcp/server.ts`，初始化 MCP Server（`@modelcontextprotocol/sdk`），注册所有种子工具
- [x] 7.4 在 `src/index.ts` 中启动 MCP Server（stdio 模式），确保与 REST API Server 在同一进程中运行
- [x] 7.5 在项目根目录创建 MCP 配置说明文件 `mcp-config.example.json`，提供 Cursor/Trae 的 MCP 接入配置示例

## 9. [可选] HTTP 框架升级（Hono）

> **触发条件**：路由数量超过 20 个，或需要请求校验中间件、统一错误处理插件时执行。
> **不推荐 NestJS**：过度工程化，与本项目轻量工具定位不符。推荐 Hono（轻量、TypeScript-first、零学习成本）。

- [x] 9.1 安装 `hono` 依赖：`npm install hono @hono/node-server`
- [x] 9.2 将 `src/api/server.ts` 中的原生 http 路由分发替换为 `Hono` 路由实例
- [x] 9.3 将 `src/api/seeds.ts` 中的路由处理器迁移为 `Hono` 路由方法（`app.get/post/patch/delete`）
- [x] 9.4 使用 `Hono` 的 `zValidator` 中间件替换手动 `readBody` + Zod parse，统一入参校验
- [x] 9.5 添加全局错误处理中间件，统一处理 `SeedNotFoundError`、`InvalidTransitionError`
- [x] 9.6 保留 MCP SSE 端点（`/sse`、`/message`）通过 `app.use` 挂载，不影响 MCP 层
- [x] 9.7 运行 `npm run type-check` 确认无类型错误，手动回归测试所有 REST 接口

## 8. 集成测试与验证

- [x] 8.1 手动测试 `POST /api/seeds` 接口，验证 Redis 写入和文件创建正确
- [x] 8.2 手动测试 `GET /api/seeds` 接口，验证分页和状态过滤
- [x] 8.3 手动测试 `PATCH /api/seeds/:id` 接口，验证合法/非法状态流转
- [x] 8.4 在 Cursor 中配置 MCP Server，验证 Agent 可通过 `create_seed` 工具成功创建种子
- [x] 8.5 验证 Redis 重启后通过 Markdown 文件可恢复数据（手动执行数据重建流程）
