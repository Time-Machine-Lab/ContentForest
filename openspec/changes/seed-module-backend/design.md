## Context

内容森林后端（`content-forest-backend`）已完成 TypeScript + Node.js 项目脚手架搭建，包含基本的目录结构（`src/api/`、`src/repositories/`、`src/services/`、`src/storage/`）和空占位文件。Redis 被选定为 MVP 阶段的热数据存储，Markdown 文件作为冷存储（人类可读的源文件），两者共同构成「动静分离」的双层存储架构。

种子（Seed）是系统中唯一必须由人类输入的实体，是后续生成器、果实池、营养汲取等所有模块的数据来源。AI Agent 通过 MCP（Model Context Protocol）协议与后端交互，禁止直接操作数据库文件以防止并发冲突。

## Goals / Non-Goals

**Goals:**

- 实现种子实体的完整生命周期管理（Draft -> Active -> Archived）
- 实现 Redis（热数据）+ Markdown 文件（冷数据）的双层写入与读取
- 严格区分种子的状态流转：草稿（Draft）仅保存，发布（Publish）后转为活跃态（Active），归档（Archive）后不再被生成器扫描
- 实现 REST API，供前端（`content-forest-front`）消费，严格限制状态变更接口
- 通过 MCP Server（基于 HTTP SSE）暴露种子工具，供 AI Agent 在 Cursor/Trae IDE 中调用
- 为多用户/SaaS 化预留 `userId` 隔离维度（MVP 固定为 `local_admin`）

**Non-Goals:**

- 不实现种子的全文搜索（MVP 阶段内存过滤即可）
- 不实现种子与果实的关联查询（果实模块职责）
- 不实现 Redis 与 Markdown 的异步同步/补偿机制（MVP 同步双写）
- 不实现用户认证鉴权（`getCurrentUser()` MVP 返回固定值）
- 不实现种子内容的版本历史

## Decisions

### 决策 1：双层存储架构（Redis + Markdown）

**选择**：写操作同时写入 Redis Hash/ZSet 和 Markdown 文件，读列表从 Redis，读详情合并 Redis 元数据 + Markdown 内容。

**理由**：

- Redis 提供 O(1) 的元数据读写和 ZSet 排序，满足列表查询的高频需求
- Markdown 文件人类可读，支持手工编辑和 AI Agent 直接阅读种子内容
- 同步双写比异步写更易于 MVP 阶段调试，牺牲的写入延迟对本地工具可忽略

**备选方案**：仅用 Redis（放弃可读性）/ 仅用文件（放弃查询性能）/ 写 Markdown 后 File Watcher 同步 Redis（依赖额外进程，复杂度高）

---

### 决策 2：Repository Pattern 隔离存储实现

**选择**：定义 `SeedRepository` 接口，`RedisSeedRepository` 实现该接口。业务层（Service）只依赖接口。

**理由**：MVP 使用 Redis，未来 SaaS 阶段可能迁移到 PostgreSQL/SQLite。接口隔离使存储层可替换，不影响业务逻辑。

**备选方案**：直接在 Service 中调用 Redis（快速但耦合，未来迁移代价高）

---

### 决策 3：Redis Key 设计

**选择**：

- 元数据 Hash：`cf:u:{userId}:s:{seedId}:meta`
- 列表 ZSet（按创建时间排序）：`cf:u:{userId}:seeds:list`

**理由**：

- 使用简写前缀（`u`/`s`）节省内存
- ZSet Score 使用 `createdAt` 时间戳，天然支持按时间分页
- `userId` 在 Key 中强制隔离，避免多用户数据污染

---

### 决策 4：Seed ID 生成规则

**选择**：`seed_{YYYYMMDD}_{nanoid(8)}`，例如 `seed_20260311_abc12345`

**理由**：前缀日期便于人工识别创建时间，`nanoid` 提供足够的随机性防止碰撞，同时避免 UUID 的冗长。

---

### 决策 5：MCP Server 集成方式

**选择**：MCP Server 作为独立模块集成在 `content-forest-backend` 中，与 REST API Server 共享同一进程，复用 Service 层。

**理由**：避免引入额外进程/容器，MVP 阶段保持部署简单。MCP Tools 直接调用 `SeedService`，保证业务逻辑统一。

**备选方案**：独立 MCP Server 进程（隔离性好但增加运维复杂度）

---

### 决策 6：文件路径与目录结构

**选择**：`/cf/data/{userId}/seeds/{YYYY}/{seedId}.md`

**理由**：按年份归档避免单目录文件过多；`userId` 前缀为 SaaS 多租户预留；`/cf/` 根目录作为整个内容森林数据的命名空间。

### 决策 7：标签（Tags）管理

**选择**：引入 Tag Registry（标签库），使用 Redis Set 存储全局标签集合。

**理由**：
- 统一管理标签，避免同义词泛滥（如 "AI", "Artificial Intelligence"）。
- 支持前端输入时的自动补全。
- 保持数据整洁，便于后续分类统计。

---

### 决策 8：MCP Server 通信协议

**选择**：HTTP SSE (Server-Sent Events)。

**理由**：
- 兼容主流 AI IDE（Cursor, Trae, Windsurf 等）的标准配置方式。
- 相比 `stdio`，更易于调试和扩展（支持远程连接）。

---

### 决策 9：数据根目录配置

**选择**：默认为当前项目根目录下的 `/cf/data/`，可通过环境变量 `CF_DATA_ROOT` 覆盖。

**理由**：
- **零配置启动**：对大多数开发者友好，开箱即用。
- **灵活性**：允许高级用户或生产环境自定义存储位置。

## Risks / Trade-offs

- **[风险] 双写原子性**：Redis 写成功但 Markdown 写失败（或反之），导致数据不一致。
→ 缓解：MVP 阶段优先写 Redis（主数据源），Markdown 写失败记录日志但不回滚（冷备份允许短暂不一致）。后续可通过定时对账脚本修复。
- **[风险] Redis 数据丢失**：本地 Redis 无持久化配置时，进程重启后数据丢失。
→ 缓解：启用 Redis AOF 持久化（`appendonly yes`）；Markdown 文件作为恢复来源，提供启动时从文件重建 Redis 索引的工具脚本。
- **[取舍] 内存过滤性能**：列表支持按 Status/Tags 过滤时，MVP 方案是全量 MGET 后在内存过滤。
→ 当种子数量 < 1000 时性能可忽略；超过 1000 后需引入 Redis Set 索引（已在代码中预留扩展点）。
- **[取舍] 同步双写延迟**：每次写操作需同时操作 Redis 和文件系统，写延迟约为两者之和（本地文件系统约 1-5ms）。
→ MVP 本地工具场景可接受；SaaS 阶段切换为异步写或使用 PostgreSQL。

## Migration Plan

**启动步骤**：

1. 确保本地 Redis 运行（`redis-server --appendonly yes`）
2. 创建 `/cf/data/local_admin/seeds/` 目录结构
3. 启动 `content-forest-backend`（`npm run dev`），REST API 在 `3001` 端口就绪
4. MCP Server 在同一进程中启动，注册工具到 Cursor/Trae MCP 配置

**回滚策略**：本次为全新模块，无迁移风险。如需回滚，删除 Redis 中 `cf:u:`* 前缀的 Key 及 `/cf/data/` 目录即可。

## Open Questions

- [Resolved] MCP Server 的通信协议：使用 HTTP SSE，兼容主流 AI IDE。
- [Resolved] `/cf/` 根目录的默认位置：默认为项目根目录，支持 `CF_DATA_ROOT` 环境变量配置。
- [Resolved] 标签（Tags）的管理：引入 Tag Registry 统一管理。

