## ADDED Requirements

### Requirement: AgentPort 接收本轮生长简报和搜索计划
系统 SHALL 在调用枝化生长 AgentPort 时传递本轮生长简报、搜索模式、突变激进程度和 attempt 级突变计划。AgentPort 输入 MUST 保持资源授权边界。

#### Scenario: 传递本轮生长简报
- **WHEN** Growth 领域调用 AgentPort 执行内部 attempt
- **THEN** 系统 MUST 提供本轮生长简报或其结构化摘要
- **AND** 系统 MUST 不直接暴露真实本地文件路径

#### Scenario: 传递动态突变计划
- **WHEN** 创作搜索层为 attempt 生成突变计划
- **THEN** 系统 MUST 将该突变计划传递给 AgentPort
- **AND** AgentPort MUST 能区分继承、变异和规避意图

### Requirement: AgentPort 可上报生成路径子步骤
系统 SHALL 允许 AgentPort 在枝化生长执行过程中上报生成路径子步骤或步骤状态更新。

#### Scenario: 上报步骤完成
- **WHEN** Agent 完成某个生成子步骤
- **THEN** 系统 MUST 能记录该步骤已完成
- **AND** 后续任务状态查询 MUST 能反映该进度

#### Scenario: 上报新增步骤
- **WHEN** Agent 根据生成器执行情况新增子步骤
- **THEN** 系统 MUST 能将该步骤追加到生成路径图
- **AND** 该步骤 MUST 归属于当前生长任务或 attempt
