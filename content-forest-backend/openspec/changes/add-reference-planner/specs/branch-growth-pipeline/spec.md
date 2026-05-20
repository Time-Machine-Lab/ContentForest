## ADDED Requirements

### Requirement: 注意力编排层必须执行参考规划
系统 SHALL 在枝化生长管线的注意力编排层执行参考规划。参考规划 MUST 发生在创作搜索或突变计划形成之后、Agent 生成执行之前，并为每个果实生成尝试产出 attempt 级参考计划。

#### Scenario: 生成执行前形成参考计划
- **WHEN** 枝化生长管线准备执行某个果实生成尝试
- **THEN** 系统 MUST 先基于本轮生长简报、突变计划、授权资源和基因经验形成参考计划
- **AND** 系统 MUST 将参考计划传递给后续 AgentPort 调用

#### Scenario: 参考规划失败时降级
- **WHEN** 参考规划无法形成有效参考计划
- **THEN** 系统 MUST 降级为既有证据卡片和突变计划行为
- **AND** 系统 MUST 在任务 trace 或 attempt metadata 中记录降级原因

### Requirement: 参考规划必须遵守授权和资料边界
系统 SHALL 只基于本次枝化生长任务已授权的资源形成参考原子和参考计划。参考规划 MUST NOT 主动读取未授权营养、基因、果实、种子或外部资料。

#### Scenario: 未授权资源不进入参考计划
- **WHEN** 某份营养、基因或上下文不在本次任务授权范围内
- **THEN** 系统 MUST NOT 将其纳入参考原子集合
- **AND** 系统 MUST NOT 在参考计划或候选果实使用资源中返回该资源

#### Scenario: 资料边界进入硬约束
- **WHEN** 授权资料包含禁用表达、风险约束或平台规则
- **THEN** 参考规划 MUST 将这些边界纳入约束影响
- **AND** 系统 MUST 在注意力路由前应用这些约束

### Requirement: 管线契约必须描述参考规划元数据
系统 SHALL 在枝化生长顶层契约中描述参考规划相关的返回和存储结构。接口契约 MUST 落到 `docs/api/growth.yaml` 的 Growth Controller，存储结构 MUST 落到 `docs/sql/growth.sql` 中的生长任务或生成尝试相关表。

#### Scenario: Growth API 暴露参考规划摘要
- **WHEN** 任务详情或 attempt 详情需要展示或调试参考规划
- **THEN** `docs/api/growth.yaml` MUST 定义参考计划摘要、参考原子摘要、计划使用和实际使用摘要字段
- **AND** 字段 MUST 以 additive 方式加入，不得移除现有搜索模式、突变激进程度或突变计划字段

#### Scenario: Growth SQL 记录参考规划元数据
- **WHEN** 系统需要持久化参考规划 trace 或 attempt metadata
- **THEN** `docs/sql/growth.sql` MUST 定义参考规划元数据的 JSON 存储位置
- **AND** 系统 MUST NOT 因本能力新增营养库 SQL 表或修改营养库资料归属规则
