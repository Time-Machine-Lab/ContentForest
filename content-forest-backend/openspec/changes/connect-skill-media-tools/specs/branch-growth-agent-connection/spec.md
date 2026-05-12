## ADDED Requirements

### Requirement: 枝化生长 Agent 输出媒体产物
系统 SHALL 允许枝化生长 AgentPort 输出候选媒体产物摘要。候选媒体产物摘要 MUST 足以让后端执行接管，但 MUST 不作为前端可访问地址。

#### Scenario: Agent 输出媒体候选
- **WHEN** Agent 执行枝化生长并产生媒体候选产物
- **THEN** AgentPort MUST 返回媒体候选产物摘要
- **AND** 后端 MUST 对候选产物执行接管和校验

#### Scenario: Agent 输出无媒体
- **WHEN** Agent 执行纯文本生成器
- **THEN** AgentPort MAY 不返回媒体候选产物
- **AND** 枝化生长 MUST 正常封装文本果实
