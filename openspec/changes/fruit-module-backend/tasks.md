## 1. 领域模型（Domain Layer）

- [ ] 1.1 创建 `src/domain/fruit.ts`：定义 `FruitStatus` 枚举、`VALID_FRUIT_TRANSITIONS` 状态机常量、`isValidFruitTransition()` 校验函数、`Fruit` 接口、`FruitGrowthData` 接口、`MetricsField` 接口、`CreateFruitDto`、`FruitNotFoundError`、`InvalidFruitTransitionError` 错误类
- [ ] 1.2 创建 `src/domain/platform-metrics-dict.ts`：定义 `PlatformMetricTemplate` 接口及各平台（xiaohongshu、douyin、twitter、wechat、other）的预设指标常量，导出 `getPlatformMetrics(platform: string)` 查询函数

## 2. 仓储层接口（Repository Interfaces）

- [ ] 2.1 创建 `src/repositories/fruit-repository.ts`：定义 `FruitRepository` 接口，包含 `save(userId, fruits[])`, `findById(userId, fruitId)`, `findBySeedId(userId, seedId)`, `update(userId, fruitId, updates)`, `delete(userId, fruitId)` 方法签名
- [ ] 2.2 创建 `src/repositories/fruit-growth-repository.ts`：定义 `FruitGrowthRepository` 接口，包含 `findByFruitId(userId, fruitId)`, `upsert(userId, data: FruitGrowthData)` 方法签名

## 3. 仓储层 Redis 实现（Repository Implementations）

- [ ] 3.1 创建 `src/repositories/redis-fruit-repository.ts`：实现 `RedisFruitRepository`，Redis Key 使用 `cf:u:{userId}:fruit:{fruitId}`（Hash）和 `cf:u:{userId}:seed:{seedId}:fruits`（ZSet，score=createdAt），实现所有接口方法
- [ ] 3.2 创建 `src/repositories/redis-fruit-growth-repository.ts`：实现 `RedisFruitGrowthRepository`，Redis Key 使用 `cf:u:{userId}:fruit:{fruitId}:growth`（Hash），metrics 序列化为 JSON 字符串存储

## 4. 业务服务层（Service Layer）

- [ ] 4.1 创建 `src/services/fruit-service.ts`：实现 `FruitService` 类，注入 `FruitRepository`、`FruitGrowthRepository`、`SeedRepository`
- [ ] 4.2 实现 `FruitService.saveFruits(userId, seedId, fruits[], parentFruitId?)`：批量生成 ID（`fruit_YYYYMMDD_nanoid8`）、设置初始状态 `generated`、写入 Redis、原子递增 `seed.fruitCount`
- [ ] 4.3 实现 `FruitService.findById(userId, fruitId)`：查找果实，不存在时抛出 `FruitNotFoundError`
- [ ] 4.4 实现 `FruitService.findBySeedId(userId, seedId)`：按种子查询全量果实列表
- [ ] 4.5 实现 `FruitService.transitionStatus(userId, fruitId, targetStatus)`：校验状态机流转合法性，非法时抛出 `InvalidFruitTransitionError`，合法时更新状态和 `updatedAt`
- [ ] 4.6 实现 `FruitService.prunePayload(userId, fruitId, preview?, payload?)`：原位更新 preview 和 payload 字段，不改变其他字段
- [ ] 4.7 实现 `FruitService.getGrowthData(userId, fruitId)`：获取成长数据，不存在时返回空结构
- [ ] 4.8 实现 `FruitService.upsertGrowthData(userId, fruitId, metrics[])`：覆盖写入成长数据，更新 `collectedAt`

## 5. HTTP API 路由（API Layer）

- [ ] 5.1 创建 `src/api/fruits.ts`：初始化 Hono 路由，定义 `getUserId()` 和 `authGuard()` 辅助函数（复用现有模式）
- [ ] 5.2 实现 `GET /api/seeds/:seedId/fruits`：调用 `FruitService.findBySeedId`，返回果实列表
- [ ] 5.3 实现 `PATCH /api/fruits/:fruitId/pickup`：调用 `transitionStatus(_, _, 'picked')`
- [ ] 5.4 实现 `PATCH /api/fruits/:fruitId/publish`：调用 `transitionStatus(_, _, 'published')`
- [ ] 5.5 实现 `PATCH /api/fruits/:fruitId/compost`：调用 `transitionStatus(_, _, 'rejected')`
- [ ] 5.6 实现 `PUT /api/fruits/:fruitId/payload`：Zod 校验 body（`payload?: string` Markdown字符串，`preview?` 对象），调用 `prunePayload`，原位覆盖存储，不解析 Markdown 内容
- [ ] 5.7 实现 `GET /api/fruits/:fruitId/metrics`：调用 `getGrowthData`
- [ ] 5.8 实现 `PUT /api/fruits/:fruitId/metrics`：Zod 校验 metrics 数组，调用 `upsertGrowthData`
- [ ] 5.9 实现 `GET /api/metrics/dict`：接受可选 query `platform`，调用 `getPlatformMetrics`，返回字典

## 6. MCP Tools（MCP Layer）

- [ ] 6.1 创建 `src/mcp/fruit-tools.ts`：定义所有 MCP Tool 的 Zod Schema 和 Handler 工厂函数 `createFruitToolHandlers(service: FruitService)`
- [ ] 6.2 实现 `save_fruits` handler：解析 `{ seedId, parentFruitId?, context, fruits[] }` 入参，其中每个 fruit 包含 `preview`（结构化对象）和 `payload`（Markdown 字符串），调用 `FruitService.saveFruits`，verbatim 存储 payload 不做解析，返回 `{ saved: [{ id, status }] }`
- [ ] 6.3 实现 `get_fruit_context` handler：解析 `{ fruitId }` 入参，调用 `FruitService.findById`，返回完整果实对象
- [ ] 6.4 实现 `update_fruit_status` handler：解析 `{ fruitId, targetStatus }` 入参，调用 `FruitService.transitionStatus`
- [ ] 6.5 实现 `pick_fruit` handler：解析 `{ fruitId }` 入参，快捷调用 `transitionStatus(_, _, 'picked')`
- [ ] 6.6 实现 `compost_fruit` handler：解析 `{ fruitId }` 入参，快捷调用 `transitionStatus(_, _, 'rejected')`，响应包含 `compostSummary: null` 扩展点

## 7. 系统集成（Integration）

- [ ] 7.1 修改 `src/api/server.ts`：导入并实例化 `RedisFruitRepository`、`RedisFruitGrowthRepository`、`FruitService`；挂载 `createFruitRoutes(fruitService)` 路由；在 `app.onError` 中注册 `FruitNotFoundError → 404`、`InvalidFruitTransitionError → 400` 映射
- [ ] 7.2 修改 `src/mcp/server.ts`：导入 `createFruitToolHandlers`，注册 5 个 fruit MCP tools（save_fruits、get_fruit_context、update_fruit_status、pick_fruit、compost_fruit）

## 8. 测试验证（Verification）

- [ ] 8.1 通过 MCP 调用 `save_fruits` 写入 3 个果实，验证 Redis Hash 写入正确、ZSet 索引建立、seed.fruitCount 递增
- [ ] 8.2 通过 HTTP `GET /api/seeds/:seedId/fruits` 验证果实列表返回正确
- [ ] 8.3 通过 HTTP 依次调用 pickup → publish，验证状态机流转；尝试对 published 果实调用 pickup，验证返回 400
- [ ] 8.4 通过 HTTP `PUT /api/fruits/:fruitId/metrics` 写入成长数据，再 `GET` 验证读取正确
- [ ] 8.5 通过 HTTP `GET /api/metrics/dict?platform=xiaohongshu` 验证字典返回包含预设指标
- [ ] 8.6 验证缺少 X-User-Id 请求头时所有接口返回 401
