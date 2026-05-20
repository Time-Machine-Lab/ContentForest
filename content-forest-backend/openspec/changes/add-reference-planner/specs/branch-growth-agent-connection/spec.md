## ADDED Requirements

### Requirement: AgentPort 必须接收参考计划输入
系统 SHALL 在枝化生长 AgentPort 输入中支持 attempt 级参考计划。参考计划 MUST 包含参考原子摘要、内容槽位路由、使用动作、约束边界和风险检查要求，并 MUST 保持资源授权边界。

#### Scenario: 传递 attempt 级参考计划
- **WHEN** Growth 领域调用 AgentPort 执行某个果实生成尝试
- **THEN** 系统 MUST 向 AgentPort 提交该 attempt 的参考计划摘要
- **AND** AgentPort 输入 MUST 能区分参考计划、突变计划、本轮生长简报和授权资源引用

#### Scenario: 不暴露真实路径或未授权正文
- **WHEN** AgentPort 输入包含参考原子来源信息
- **THEN** 系统 MUST 只传递受控资源标识、来源类型、摘要和边界
- **AND** 系统 MUST NOT 暴露真实本地绝对路径
- **AND** 系统 MUST NOT 传递未授权资源正文

### Requirement: AgentPort 必须返回参考使用摘要
系统 SHALL 允许枝化生长 AgentPort 返回候选果实的参考使用摘要。参考使用摘要 MUST 区分计划参考和实际使用，并 MUST 能被 Growth 领域用于 trace、校验和营养使用关系记录。

#### Scenario: 返回计划与实际使用差异
- **WHEN** AgentPort 返回候选果实结构
- **THEN** 返回结果 MUST 能包含计划参考原子摘要和实际使用资源摘要
- **AND** 系统 MUST 能表达计划但未实际落地的参考项
- **AND** 系统 MUST 能表达实际使用但需要本地校验确认的参考项

#### Scenario: 参考使用摘要仍受授权限制
- **WHEN** Agent 返回参考使用摘要
- **THEN** Growth 领域 MUST 校验其中的资源引用属于本次授权范围
- **AND** 未授权引用 MUST 导致校验失败或被记录为不可接受候选结果

### Requirement: Agent 连接 trace 必须记录参考规划阶段
系统 SHALL 在枝化生长 Agent 连接 trace 中记录参考规划相关阶段。Trace MUST 包含参考计划生成、传递、使用摘要接收、校验和降级信息，但 MUST NOT 泄露过长正文、API Key、Cookie、MCP session id 或真实本地路径。

#### Scenario: 成功传递参考计划
- **WHEN** Growth 成功向 AgentPort 提交含参考计划的 attempt
- **THEN** Trace MUST 记录参考计划传递成功
- **AND** Trace MUST 包含参考原子数量、来源类型摘要和风险等级摘要

#### Scenario: 参考计划校验失败
- **WHEN** 参考计划或参考使用摘要未通过本地校验
- **THEN** Trace MUST 记录可诊断的失败原因
- **AND** 系统 MUST NOT 将失败详情中的敏感凭据或真实路径暴露给 Agent 可见上下文
