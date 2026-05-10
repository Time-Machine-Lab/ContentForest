## Why

当前枝化生长在果实数量大于 1 时按串行方式逐个调用 Agent，整体耗时会随果实数量线性增长。与此同时，服务异常中断后可能遗留 `running` 生长任务和来源节点生长锁，导致节点长期无法再次生长。

本次变更在保持第一期轻量化边界的前提下，将单个生长任务内的果实生成尝试改为受限并发，并补齐单实例后端下的中断任务收敛与死锁释放能力。

## What Changes

- 将单个枝化生长任务内的果实生成尝试从串行执行改为生产者/消费者式受限并发执行。
- 默认并发 worker 数为 2，并发上限为 3；果实数量仍表示总生成尝试数，最大值仍为 6。
- 每个果实生成尝试继续独立记录成功或失败，成功尝试仍立即创建并挂载果实。
- GrowthTask 不由并发 worker 分散更新成功果实集合，而是在所有尝试结束后统一汇总 attempts 并收敛任务状态。
- 引入当前进程内的 active growth task 运行登记，用于判断数据库中的 `running` 任务是否仍有真实执行者。
- 在后端启动或任务状态查询等安全时机收敛无真实执行者的中断遗留任务：有成功 attempt 则完成任务，无成功 attempt 则失败任务并保存最近失败输入，同时释放来源节点生长锁。
- 不自动重试中断任务，不引入分布式任务系统，不改变 API 契约和数据库表结构。

## Capabilities

### New Capabilities

### Modified Capabilities
- `branch-growth`: 修改果实生成尝试执行规则，从串行执行调整为受限并发执行，并补充中断遗留 running 任务和生长锁的收敛规则。

## Impact

- Affected backend modules: `GrowthService` execution loop, growth scheduler integration, growth storage queries used for running task/lock recovery, and related tests.
- Affected runtime behavior: one GrowthTask may have up to 2 concurrent Agent attempts by default, with maximum concurrency capped at 3.
- Affected observability: concurrent Agent attempts continue to produce independent Agent exchange logs; existing log naming rules already require same-second log files not overwrite each other.
- API impact: no endpoint or request/response contract changes are required.
- SQL impact: no table or column changes are required; existing `growth_tasks`, `growth_attempts`, `growth_locks`, and `growth_failed_inputs` tables are sufficient.
