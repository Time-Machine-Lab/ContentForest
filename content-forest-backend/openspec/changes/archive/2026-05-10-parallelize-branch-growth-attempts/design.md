## Context

枝化生长领域设计中，生长任务是一次用户可见的枝化生长批次，内部可以包含多个果实生成尝试。当前实现中，果实数量为 N 时会串行执行 N 次 AgentPort 调用。该行为简单可靠，但在真实 LLM 环境下耗时较长，尤其是果实数量为 3 到 6 时用户等待明显。

同时，生长任务依赖来源节点生长锁。当前锁在正常执行完成或异常路径中释放，但如果后端进程在任务运行中退出，内存中的执行流程消失，数据库仍可能遗留 `running` 任务和 `growth_locks` 记录，导致来源节点被长期视为正在生长。

本次变更仍遵守第一期边界：枝化生长模块不是通用任务系统，不引入分布式 worker，不自动重试中断任务，不改变 API 和 SQL 表结构。

## Goals / Non-Goals

**Goals:**

- 将单个生长任务内的果实生成尝试改为轻量生产者/消费者并发执行。
- 默认并发数为 2，系统最大并发数不超过 3。
- 每个 attempt 独立调用 AgentPort、独立创建果实、独立记录成功或失败。
- GrowthTask 最终状态由全部 attempts 统一汇总，避免并发 worker 同时写同一个任务聚合。
- 解决服务中断后遗留 `running` 任务和来源节点锁的问题。
- 保持现有 API、SQL 表结构和前端轮询语义不变。

**Non-Goals:**

- 不实现自动重试。
- 不实现分布式锁、心跳租约或多实例 worker 协调。
- 不新增任务队列表、消息队列或后台任务系统。
- 不取消慢 attempt，也不因为某个 attempt 慢而提前结束整个任务。
- 不改变果实数量上限和 GrowthTask 三态模型。

## Decisions

### Decision 1: 使用任务内生产者/消费者并发池

在 `executeTaskAttempts` 内部构建 attempt index 队列，并启动固定数量 worker 消费队列。worker 从队列取出下一个 attempt index，创建 attempt，调用 `runSingleAttempt`，保存 attempt 结果，然后继续取下一个 index，直到队列为空。

默认 worker 数为 2。即使后续支持配置，系统也必须把 worker 数限制在 1 到 3 之间，并且不得超过本次任务 fruitCount。

Alternative considered: 使用 `Promise.all` 一次性启动全部 attempts。该方案实现更短，但 fruitCount 最大为 6，可能同时打满 LLM 与文件/SQLite 写入，并且不利于未来控制供应商限流。

### Decision 2: Worker 不直接更新 GrowthTask 聚合

并发 worker 只更新 attempt 和创建果实，不直接更新 `GrowthTask.successfulFruitIds`、任务状态或 finishedAt。所有 worker 完成后，系统重新读取或收集 attempt 结果，统一汇总成功 fruitId，并一次性更新 GrowthTask。

Alternative considered: 每个成功 attempt 立即读取并保存 GrowthTask。该方案容易产生丢更新：两个 worker 基于旧 successfulFruitIds 同时保存，后写入者可能覆盖先写入者。

### Decision 3: 成功果实立即落地

每个 attempt 成功后仍立即通过果实领域创建果实并挂载到来源节点下，然后将 attempt 标记为 succeeded。即使同批次后续 attempt 失败，已创建果实也不回滚。

Alternative considered: 等所有 attempts 完成后批量创建果实。该方案能让任务汇总更简单，但会延迟用户看到成果，并且不符合“部分成功不回滚”的现有领域语义。

### Decision 4: 用进程内 active task set 判断真实执行者

第一期后端按单实例 Node 进程设计。GrowthService 在开始执行某个 task 时将 taskId 加入进程内 active set，任务执行结束后移除。服务重启后 active set 为空，因此数据库中遗留的 `running` task 可以被判断为没有真实执行者。

Alternative considered: 在数据库中增加 heartbeat/lease 字段。该方案更适合 SaaS 多实例，但会带来 SQL 变更和更重的调度语义，不适合第一期当前目标。

### Decision 5: 中断遗留任务不自动重试，只收敛状态并解锁

系统在启动时执行一次中断遗留任务收敛。对于没有真实执行者的 running task，读取其 attempts：如果已有 succeeded attempt，则将任务标记为 completed 并汇总 fruitId；如果没有成功 attempt，则将任务标记为 failed，保存最近失败输入，并释放来源节点锁。

Alternative considered: 自动重试未完成 attempts。该方案可能在用户不知情的情况下继续消耗 LLM，并且会让恢复流程接近任务系统，不符合第一期轻量化。

## Risks / Trade-offs

- [Risk] 并发 LLM 调用触发供应商限流 → Mitigation: 默认并发 2，最大 3，不一次性启动全部 attempts。
- [Risk] 并发 worker 同时写 GrowthTask 导致成功果实集合丢失 → Mitigation: worker 只写 attempt，任务结束后统一汇总。
- [Risk] 服务在“果实已创建但 attempt 未标记成功”之间中断 → Mitigation: 第一版接受低概率不一致；后续可通过果实来源 attemptId 建立更强恢复关系。
- [Risk] 单实例 active set 不适用于未来多实例部署 → Mitigation: 文档明确这是第一期方案，未来 SaaS 形态再演进为数据库 lease/heartbeat。
- [Risk] 启动时错误收敛当前仍在运行的任务 → Mitigation: 单实例进程重启后内存任务天然不存在；同一进程内 active set 中的任务不得被收敛。

## Migration Plan

本次变更不涉及数据库结构迁移和 API 契约迁移。部署后，后端启动时应执行一次中断遗留任务收敛，以处理升级前遗留的 running task 或 growth lock。回滚时，已完成/失败的任务状态仍可被旧逻辑读取。

## Open Questions

- 是否在后续版本把并发数暴露为环境配置项。第一版可以固定默认 2，并在代码内部保留最大 3 的归一化逻辑。
