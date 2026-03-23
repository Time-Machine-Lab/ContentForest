## Context

内容森林后端已完成种子（Seed）和生成器（Generator）两个核心模块，均采用 **Domain → Repository → Service → API / MCP** 四层架构，Redis 作为主存储，`X-User-Id` 请求头实现用户隔离。果实（Fruit）是整条内容生产链路的产出物，是连接生成器执行结果与用户选品决策的核心实体，目前完全缺失。

现有约束：
- 技术栈：TypeScript + Hono + Redis（ioredis）+ MCP SDK
- 用户隔离：所有 Redis Key 必须包含 `userId` 维度
- MCP 工具统一注册在 `src/mcp/server.ts`
- HTTP 路由统一挂载在 `src/api/server.ts`

## Goals / Non-Goals

**Goals:**
- 实现果实的完整生命周期（创建、状态流转、修剪、查询）
- 实现果实成长数据（Metrics）的独立存储与读写
- 暴露 5 个 MCP Tools 供 Agent 驱动生成流程
- 暴露 8 个 HTTP 接口供 Web UI 操作
- 写入果实时原子维护种子的 `fruitCount` 计数
- 严格遵循现有分层架构，新模块可零摩擦并入

**Non-Goals:**
- 营养库（Nutrients）实装：本期只在 `context.nutrientsUsed` 预留字段
- Markdown 文件备份：本期只写 Redis，文件同步为二期
- 多父节点 DAG（嫁接重组）：本期使用单父 `parentFruitId?: string`
- 支付 / 权限体系：MVP 单用户本地环境
- 生成日志（GenerationLog）写入：由 Agent 单独调用现有 `write_generation_log` MCP Tool

## Decisions

### Decision 1: 单父节点（parentFruitId）而非多父 DAG

**选择**：`parentFruitId?: string`（单父，简单树）

**理由**：MVP 阶段进化树的使用场景是线性迭代（A → A1 → A2），多父 DAG（嫁接重组）是高级功能。单父实现简单，Redis ZSet 排序、前端 Vue Flow 渲染均无复杂度，且可无破坏性升级为 `parentFruitIds: string[]`。

**备选**：直接使用 `parentFruitIds: string[]`。被否决原因：前端 DAG 布局算法复杂，MVP 阶段无对应用例。

---

### Decision 2: FruitGrowthData 独立 Redis Hash

**选择**：成长数据存独立 Key `cf:u:{userId}:fruit:{fruitId}:growth`，不嵌入 Fruit Hash。

**理由**：监控数据更新频率远高于果实主体（发布后可能每天更新），分离存储避免大 Hash 频繁全量读写。符合单一职责原则，未来监控器模块可独立操作 growth Key 无需感知 Fruit 主体。

**备选**：将 metrics 作为 JSON 字符串嵌入 Fruit Hash 的一个字段。被否决原因：破坏领域边界，监控器需要解析 Fruit Hash 才能写入数据。

---

### Decision 3: 平台指标字典为静态 TS 常量

**选择**：`src/domain/platform-metrics-dict.ts` 导出静态常量，不写 Redis。

**理由**：字典是配置数据，不随业务状态变化，无需持久化。静态常量零运行时开销，类型安全，修改只需改代码而非操作数据库。

**备选**：存 Redis Hash，支持运行时热更新。被否决原因：MVP 阶段字典变更频率极低，引入运行时可变配置增加复杂度无收益。

---

### Decision 4: payload 为纯 Markdown 字符串

**选择**：`payload: string`，存储 Agent 生成的完整 Markdown 内容，系统不解析、不校验其结构。

**理由**：生成器面向不同平台输出不同格式的内容（小红书、推特、视频脚本等），容器化 `Record<string, any>` 需要系统预知所有字段结构，与「平台解耦」设计理念冲突。纯 Markdown 方案让生成器完全自由，前端统一使用 Markdown 渲染组件，修剪操作简化为直接编辑字符串，无需理解字段结构。`preview` 字段由 Agent 单独填写，作为卡片渲染的稳定数据源，与 payload 解耦。

**备选**：容器化 `Record<string, any>`，系统定义各平台字段 schema。被否决原因：每新增平台需修改系统 schema，违反开放封闭原则；Agent 编写生成器时需了解系统字段规范，门槛高；前端渲染需针对每种 payload 结构写适配逻辑。

---

### Decision 4: save_fruits 支持批量写入

**选择**：`save_fruits` MCP Tool 接受 `fruits: FruitInput[]` 数组，单次调用持久化多个果实。

**理由**：Agent 生成一次通常产出 3-5 个变体，逐条调用会产生多次 MCP 往返延迟。批量写入后 `fruitCount` 只需更新一次，减少 Redis 写操作。

**备选**：单果实写入，Agent 循环调用。被否决原因：效率低，且 fruitCount 需要多次原子递增，容易出现竞态。

---

### Decision 5: fruitCount 在 FruitService 内部原子维护

**选择**：`FruitService.saveFruits()` 在写入果实后，直接调用 `SeedRepository.update()` 递增 `fruitCount`，调用方无需感知此逻辑。

**理由**：fruitCount 是种子的冗余计数字段，维护责任应由触发方（FruitService）承担，避免调用方（MCP Handler）遗漏更新。封装在 Service 层符合「业务逻辑不外漏」原则。

**备选**：由 MCP Handler 在调用 `save_fruits` 后手动调用 seed 更新。被否决原因：跨 Service 的副作用由 Handler 管理违反分层原则，且容易遗漏。

---

### Decision 6: 状态机显式定义 VALID_TRANSITIONS（对齐 Seed 模块模式）

**选择**：在 `src/domain/fruit.ts` 定义 `VALID_FRUIT_TRANSITIONS` 常量 Map，`FruitService` 调用 `isValidFruitTransition()` 校验，抛出 `InvalidFruitTransitionError`，在 `server.ts` 映射为 HTTP 400。

**理由**：与 Seed 模块完全一致的模式，降低认知负担。状态机规则集中在 domain 层，Service 和 API 层均复用同一校验逻辑。

## Risks / Trade-offs

- **[风险] fruitCount 与实际果实数不一致** → 缓解：`saveFruits` 使用 Redis `HINCRBY` 原子操作；如发现不一致可通过 ZSet `ZCARD` 修复计数。
- **[风险] Fruit Hash 字段过多导致序列化开销** → 缓解：`payload` 存为 JSON 字符串字段，列表接口可选择性返回 `preview`，不强制返回完整 `payload`。
- **[Trade-off] MVP 不做 Markdown 备份** → 接受风险：Redis 单点故障会丢失数据。缓解方案：二期补充 file-storage 同步层，当前使用本地 Redis 风险可控。
- **[风险] MCP Tool 的 userId 来自 getCurrentUser()** → 与现有 Seed/Generator 模块一致，无额外风险。

## Migration Plan

1. 新增 `src/domain/fruit.ts` 和 `src/domain/platform-metrics-dict.ts`
2. 新增 repository 接口与 Redis 实现
3. 新增 `src/services/fruit-service.ts`
4. 新增 `src/api/fruits.ts` 路由文件
5. 新增 `src/mcp/fruit-tools.ts` MCP 工具文件
6. 修改 `src/api/server.ts`：挂载 fruitRoutes，注册 `FruitNotFoundError`、`InvalidFruitTransitionError` 错误映射
7. 修改 `src/mcp/server.ts`：注册 fruit MCP tools

**回滚**：所有新增文件独立，server.ts 的挂载行为可注释回滚，不影响现有 Seed / Generator 功能。

## Open Questions

- 营养库（Nutrients）模块何时启动提案？`context.nutrientsUsed` 字段需要对应的营养库实体才能产生业务价值。
- 未来是否需要「果实列表」的分页支持？当前 `GET /api/seeds/:seedId/fruits` 返回全量，种子果实数量极大时需要分页。
- Markdown 备份的触发时机：写时同步（同一事务）还是异步队列？影响 `file-storage.ts` 的扩展方式。
