## ADDED Requirements

### Requirement: Agent 输入携带基因表现摘要
系统 SHALL 在构建基因汲取 Agent 输入时提供可引用基因经验的表现摘要。表现摘要 MUST 来自基因库演化系统事实，并 MUST 保持任务授权边界。

#### Scenario: 基因汲取输入包含表现摘要
- **WHEN** 基因领域服务构建 `gene_extraction` Agent 输入
- **THEN** 输入中的可引用基因经验 MUST 能携带使用次数、结果倾向和轻量评分
- **AND** 输入 MUST 只包含当前种子授权范围内的基因经验

#### Scenario: 无表现数据时返回零值摘要
- **WHEN** 某条可引用基因经验没有任何使用记录
- **THEN** Agent 输入 MUST 能表达该经验暂无历史表现
- **AND** 系统 MUST NOT 因缺少表现数据而排除该未归档经验

### Requirement: Agent 不负责更新基因表现
系统 SHALL 保持 Agent 与基因表现系统事实的写入边界。Agent 可以读取表现摘要并生成建议，但 MUST NOT 直接创建使用记录、修改评分或归档基因经验。

#### Scenario: Agent 返回建议不直接更新评分
- **WHEN** Agent 完成一次基因汲取或枝化生长任务
- **THEN** 系统 MUST NOT 让 Agent 输出直接修改基因表现汇总
- **AND** 基因表现更新 MUST 由后端领域服务基于明确业务操作完成

#### Scenario: Agent 建议归档但不执行归档
- **WHEN** Agent 建议某条基因经验应该弱化、分叉或归档
- **THEN** 系统 MUST 将该内容作为建议或说明展示
- **AND** 系统 MUST NOT 让 Agent 直接归档正式基因经验
