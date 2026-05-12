## ADDED Requirements

### Requirement: 基因经验沉淀后进入持续演化
系统 SHALL 将用户确认后的正式基因经验纳入种子级基因库持续演化范围。正式基因经验创建后 MUST 可以被后续使用记录、表现汇总和谱系回看引用。

#### Scenario: 确认建议后可被跟进
- **WHEN** 用户确认一条基因建议为正式基因经验
- **THEN** 系统 MUST 让该基因经验进入可持续跟进范围
- **AND** 系统 MUST 允许后续为该基因经验记录使用结果

#### Scenario: 放弃建议不进入演化
- **WHEN** 用户放弃一条待确认基因建议
- **THEN** 系统 MUST NOT 为该建议创建正式基因经验
- **AND** 系统 MUST NOT 为该建议创建基因表现汇总

### Requirement: 可引用基因经验携带表现摘要
系统 SHALL 支持在查询可引用基因经验时携带轻量表现摘要。表现摘要 MUST 来自系统维护的基因表现汇总，不得从 Markdown 正文解析。

#### Scenario: 查询可引用经验时包含表现信息
- **WHEN** 枝化生长模块或 Agent 上下文查询某个种子的可引用基因经验
- **THEN** 系统 MUST 能提供该经验的使用次数和结果倾向摘要
- **AND** 系统 MUST 仍排除已归档基因经验

#### Scenario: Markdown 不提供表现 meta
- **WHEN** 系统读取基因经验 Markdown 正文
- **THEN** 系统 MUST NOT 从 Markdown 中解析使用次数、评分或结果统计
- **AND** 表现信息 MUST 由数据库系统事实维护
