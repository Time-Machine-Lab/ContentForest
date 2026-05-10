## ADDED Requirements

### Requirement: 传递 attempt 级生长策略上下文
系统 SHALL 在通过 AgentPort 执行果实生成尝试时传递 attempt 级生长策略上下文。该上下文 MUST 包含本次尝试的探索方向、目标假设和可访问资源范围，并 MUST 不直接暴露真实文件路径或未授权资源内容。

#### Scenario: 多果实生长包含不同策略上下文
- **WHEN** 用户发起果实数量大于 1 的枝化生长任务
- **THEN** 系统 MUST 为每次果实生成尝试提供可区分的 attempt 策略上下文
- **AND** 每个 attempt 仍 MUST 只生成一个候选果实

#### Scenario: AgentPort 输入保持资源授权边界
- **WHEN** Growth 领域调用 AgentPort 执行某次果实生成尝试
- **THEN** 系统 MUST 传递来源节点引用、用户输入、生成器引用、授权资源范围和 attempt 策略上下文
- **AND** 系统 MUST 不把未授权资料或真实本地路径塞入 AgentPort 输入

### Requirement: 保留策略失败的尝试级失败语义
系统 SHALL 将生长策略编排失败视为对应果实生成尝试失败。系统 MUST 保持既有任务完成判定：至少一个果实成功则任务完成，没有任何果实成功则任务失败。

#### Scenario: 单个策略编排失败
- **WHEN** 某个果实生成尝试无法形成有效生长策略或策略校验失败
- **THEN** 系统 MUST 将该尝试记录为失败
- **AND** 系统 MUST 允许同批次其他尝试继续执行

#### Scenario: 全部策略或生成均失败
- **WHEN** 一次生长任务没有任何尝试成功创建果实
- **THEN** 系统 MUST 将生长任务标记为失败
- **AND** 系统 MUST 保存最近失败输入供用户重试

### Requirement: 记录生长策略摘要用于排查
系统 SHALL 在不改变公开 API 和数据库结构的前提下保留生长策略摘要的可观测性。系统 MUST 能在 attempt 的 Agent 输出、Trace 或交流日志中定位本次尝试使用的策略版本和探索方向。

#### Scenario: 成功 attempt 可追踪策略
- **WHEN** 某次果实生成尝试成功
- **THEN** 系统 MUST 能通过运行记录定位该 attempt 的策略版本或探索方向摘要
- **AND** 系统 MUST 不在 Markdown 正文中写入由数据库维护的系统 meta

#### Scenario: 失败 attempt 可追踪策略阶段
- **WHEN** 某次果实生成尝试失败
- **THEN** 系统 MUST 记录失败发生在策略编排、生成器 payload、结构化封装或本地校验中的哪个阶段
- **AND** 失败原因 MUST 可用于后续优化策略模型
