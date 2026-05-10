## 1. 执行模型调整

- [x] 1.1 在 GrowthService 内引入单任务内 attempt worker 并发执行能力，默认并发数为 2
- [x] 1.2 将并发数归一化到 1 到 3 之间，并且不得超过当前任务 fruitCount
- [x] 1.3 将原串行 attempt 循环改为生产者/消费者队列消费模型
- [x] 1.4 确保每个 worker 只创建 attempt、调用 AgentPort、创建果实并保存 attempt 结果，不直接更新 GrowthTask 成功果实集合

## 2. 任务结果汇总

- [x] 2.1 在全部 worker 结束后基于 attempt 结果统一汇总成功 fruitId
- [x] 2.2 根据汇总结果将 GrowthTask 收敛为 completed 或 failed
- [x] 2.3 保持部分成功不回滚已创建果实，全部失败保存最近失败输入
- [x] 2.4 保持任务结束后释放来源节点生长锁

## 3. 中断遗留任务收敛

- [x] 3.1 为 GrowthService 增加当前进程 active growth task 登记与移除机制
- [x] 3.2 增加扫描 running GrowthTask 或 growth lock 的存储读取能力，不新增表和字段
- [x] 3.3 实现无真实执行者 running task 的收敛：有成功 attempt 则 completed，无成功 attempt 则 failed
- [x] 3.4 在收敛失败任务时保存最近失败输入，供用户手动重试
- [x] 3.5 在收敛后释放对应来源节点生长锁
- [x] 3.6 在应用启动装配阶段调用一次中断遗留任务收敛能力

## 4. 测试与验证

- [x] 4.1 更新原“串行执行”测试为受限并发执行测试
- [x] 4.2 增加并发上限测试，验证 fruitCount 大于并发数时 worker 会继续消费剩余 attempt
- [x] 4.3 增加并发下部分成功、全部失败、成功 fruitId 汇总的测试
- [x] 4.4 增加中断遗留 running task 有成功 attempt 时收敛为 completed 并解锁的测试
- [x] 4.5 增加中断遗留 running task 无成功 attempt 时收敛为 failed、保存失败输入并解锁的测试
- [x] 4.6 运行 GrowthService 相关测试、后端类型检查和 OpenSpec 严格校验
