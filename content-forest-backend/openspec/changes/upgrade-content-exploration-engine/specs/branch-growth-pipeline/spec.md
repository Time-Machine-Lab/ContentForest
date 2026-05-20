## ADDED Requirements

### Requirement: 创作搜索层生成解空间地图
系统 SHALL 在枝化生长管线的创作搜索层生成本轮内容解空间地图。该步骤 MUST 发生在本轮生长简报和授权上下文准备之后、attempt 级突变计划生成之前，并 MUST 继续遵守现有管线边界。

#### Scenario: 在管线中生成解空间地图
- **WHEN** 生长任务完成输入层和上下文补全层
- **THEN** 创作搜索层 MUST 基于本轮生长简报、生成器、用户输入、来源节点、营养、临时营养卡片、基因和反馈生成解空间地图
- **AND** 系统 MUST 不把解空间地图建模为新的长期领域聚合

#### Scenario: 解空间地图降级
- **WHEN** 创作搜索层无法生成有效解空间地图
- **THEN** 系统 MUST 降级到现有搜索模式、突变激进程度和动态突变计划继续执行
- **AND** 系统 MUST 在任务 Trace 或日志中记录降级原因

### Requirement: 为每个果实生成尝试分配探索路线
系统 SHALL 在创建或执行 attempt 时为每个果实生成尝试分配探索路线。路线选择 MUST 在符合种子、用户要求和生成器格式约束的前提下兼顾质量与差异性。

#### Scenario: 多果实时路线差异化
- **WHEN** 用户请求一次枝化生长生成多个果实
- **THEN** 系统 MUST 为每个 attempt 分配一个选中探索路线
- **AND** 多个路线 SHOULD 在目标、平台、受众、形态、叙事或互动方式上体现可比较差异

#### Scenario: 单果实时仍有选中路线
- **WHEN** 用户请求一次枝化生长只生成一个果实
- **THEN** 系统 MUST 仍为该 attempt 形成选中探索路线或兼容兜底路线
- **AND** 该路线 MUST 能进入 AgentPort 输入和策略 Trace

### Requirement: 搜索模式和突变程度控制路线选择范围
系统 SHALL 保留搜索模式和突变激进程度作为用户可理解的轻量控制。搜索模式 MUST 影响候选路线选择策略，突变激进程度 MUST 影响路线内变量变化半径。

#### Scenario: 广泛探索扩大路线差异
- **WHEN** 搜索模式为广泛探索
- **THEN** 系统 MUST 优先选择差异更大的候选探索路线
- **AND** 系统 MUST 保持所有路线不偏离种子事实和用户明确约束

#### Scenario: 方向强化收敛到有效路线
- **WHEN** 搜索模式为方向强化
- **THEN** 系统 MUST 优先选择与来源果实、正向基因或用户目标一致的路线
- **AND** 系统 MUST 通过突变算子寻找更强表达版本

#### Scenario: 负反馈规避生成替代路线
- **WHEN** 搜索模式为负反馈规避
- **THEN** 系统 MUST 将负向基因、淘汰原因或失败反馈转化为风险约束
- **AND** 系统 MUST 选择能够避开失效模式的替代路线

### Requirement: 更新枝化生长 API 与 SQL 契约
系统 SHALL 在实现路线元数据前更新顶层枝化生长 API 与 SQL 契约。接口契约 MUST 落到 `docs/api/growth.yaml`，存储契约 MUST 落到 `docs/sql/growth.sql`，并 MUST 使用向后兼容的 additive 字段或现有 JSON 字段说明。

#### Scenario: API 契约描述路线元数据
- **WHEN** 任务详情、attempt 详情或调试响应需要暴露解空间摘要、选中路线、参考计划或突变算子
- **THEN** 系统 MUST 在 `docs/api/growth.yaml` 中定义对应 schema
- **AND** 新字段 MUST 不移除现有 `searchMode`、`mutationIntensity` 和 `mutationPlan`

#### Scenario: SQL 契约描述路线存储
- **WHEN** 生长任务或 attempt 需要持久化路线元数据
- **THEN** 系统 MUST 在 `docs/sql/growth.sql` 中说明使用的 JSON 字段或新增字段
- **AND** 系统 MUST 不要求为第一版路线模型新增独立路线表
