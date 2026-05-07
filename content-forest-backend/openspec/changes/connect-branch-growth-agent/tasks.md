## 1. 顶层契约文档

- [x] 1.1 更新 `docs/api/growth.yaml`，明确创建和重试生长任务会立即返回 `running` 任务，后台继续执行 Agent 尝试
- [x] 1.2 核对 `docs/sql/growth.sql` 是否仍覆盖异步执行所需的任务、尝试、锁和失败输入；如无需改表，在实现说明中保持不变

## 2. 后台执行模型

- [x] 2.1 为 Growth 模块增加轻量后台执行入口，支持创建任务后异步处理 attempts
- [x] 2.2 调整 `startGrowthTask`，使其完成校验、创建任务、加锁后立即返回运行中任务
- [x] 2.3 调整 `retryLatestFailedTask`，使重试任务同样按异步执行规则创建并返回运行中任务
- [x] 2.4 确保后台执行完成或失败时统一释放来源节点生长锁

## 3. Agent 对接

- [x] 3.1 保持每个 attempt 调用一次 `AgentPort.runTask`，任务类型为 `growth`
- [x] 3.2 确保传给 Agent 的输入包含来源节点、用户输入、生成器引用、授权资源引用、详情参数和 `target.fruitCount = 1`
- [x] 3.3 使用结构化候选果实校验结果调用 FruitService 创建果实，并记录成功 attempt 的 `fruitId`
- [x] 3.4 确保 Agent 失败或候选结果不可落地时只标记当前 attempt 失败，不回滚已创建果实

## 4. 状态归结与轮询

- [x] 4.1 根据成功果实数量归结任务状态：至少一个成功为 `completed`，全部失败为 `failed`
- [x] 4.2 完全失败时保存该来源节点最近失败输入，成功时清理该来源节点失败输入
- [x] 4.3 确保 `getGrowthTask` 能返回运行中任务的当前 attempts 和成功果实标识
- [x] 4.4 确保 `getSourceStatus` 能在后台执行期间返回节点正在生长和对应任务标识

## 5. 测试与验证

- [x] 5.1 增加 GrowthService 单元测试，覆盖创建任务立即返回 running、后台完成后状态变化和锁释放
- [x] 5.2 增加多果实 attempt 测试，覆盖部分成功完成、全部失败保存失败输入、不回滚成功果实
- [x] 5.3 增加 Growth HTTP 集成测试，覆盖创建任务响应语义、任务轮询和来源节点状态轮询
- [x] 5.4 运行 `npm run typecheck` 和 `npm test`
