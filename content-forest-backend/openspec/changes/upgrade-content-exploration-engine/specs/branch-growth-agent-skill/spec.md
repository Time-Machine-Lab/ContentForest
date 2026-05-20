## ADDED Requirements

### Requirement: 枝化生长 Skill 以探索路线为主要策略输入
系统 SHALL 要求内置枝化生长 Skill 在生成器 payload 生成前使用选中探索路线作为主要策略输入。探索路线 MUST 优先于固定探索槽位，固定探索槽位只能作为兼容摘要或兜底机制。

#### Scenario: 使用选中路线生成 payload
- **WHEN** AgentPort 输入包含选中探索路线和参考计划
- **THEN** 内置枝化生长 Skill MUST 将其纳入生成器 payload 提示或脚本输入
- **AND** 生成内容 MUST 与该路线的目标、平台、受众、形态、叙事机制和风险约束保持一致

#### Scenario: 缺少路线时使用兜底
- **WHEN** AgentPort 输入缺少有效选中探索路线
- **THEN** 内置枝化生长 Skill MAY 使用现有突变计划或固定探索槽位兜底
- **AND** Trace MUST 记录本次使用兜底策略

### Requirement: 证据卡片覆盖正式营养和临时营养候选
系统 SHALL 要求内置枝化生长 Skill 将正式营养和临时营养卡片都组织为证据卡片。正式营养 MUST 表达为已沉淀参考，临时营养卡片 MUST 表达为候选证据或低置信参考。

#### Scenario: 正式营养形成证据卡片
- **WHEN** 授权资源包含正式营养
- **THEN** 枝化生长 Skill MUST 生成来源类型为正式营养的证据卡片
- **AND** 候选果实在实际使用时 MAY 声明对应正式营养资源引用

#### Scenario: 临时营养卡片形成候选证据卡片
- **WHEN** 授权资源包含未沉淀临时营养卡片
- **THEN** 枝化生长 Skill MUST 生成标记为候选证据的证据卡片
- **AND** Skill MUST 不把该卡片描述为已沉淀营养库内容

### Requirement: 生成提示包含参考计划而不是无差别拼接
系统 SHALL 要求内置枝化生长 Skill 将参考计划交给生成器提示或脚本输入。参考计划 MUST 说明每类上下文对本次路线的作用，并 MUST 避免把所有资料无差别拼接成单一长上下文。

#### Scenario: 参考计划进入提示上下文
- **WHEN** Skill 构建生成器 payload 提示上下文
- **THEN** 提示上下文 MUST 包含选中路线的参考计划摘要
- **AND** 参考计划 MUST 区分强约束、证据参考、候选证据、继承、组合、变异和规避

#### Scenario: 生成器脚本接收路线输入
- **WHEN** 外部生成器 Skill 使用受控脚本辅助生成
- **THEN** 脚本输入 MUST 包含选中路线、突变算子和参考计划摘要
- **AND** 脚本仍 MUST 只返回生成器 payload，不得直接创建果实或声明系统事实

### Requirement: 候选果实返回路线相关候选 meta
系统 SHALL 允许枝化生长 Skill 在候选果实 meta 或 Agent metadata 中返回路线相关候选信息。路线相关信息 MAY 包含路线标识、路线摘要、突变算子、成功信号、风险约束和参考资源使用摘要，但 MUST 不声明已保存、已发布或已完成任务等系统事实。

#### Scenario: 返回路线摘要
- **WHEN** Skill 成功生成候选果实
- **THEN** AgentPort 返回结果 SHOULD 包含该候选果实对应的路线摘要或路线标识
- **AND** Growth 领域 MUST 继续负责最终落地与系统事实维护

#### Scenario: 拒绝系统事实伪造
- **WHEN** 候选果实 meta 中出现已保存果实、已完成任务或已发布等系统事实声明
- **THEN** 本地校验 MUST 将其视为非法输出
- **AND** 系统 MUST 进入修复流程或标记本次尝试失败

### Requirement: 记录路线级 Skill Trace
系统 SHALL 为内置枝化生长 Skill 记录路线级 Trace。Trace MUST 包含算法版本、平台推断来源、解空间摘要、选中路线、参考计划摘要、证据卡片数量、突变算子和候选封装结果。

#### Scenario: 路线策略成功
- **WHEN** Skill 成功完成策略编排和候选果实生成
- **THEN** Trace MUST 包含选中路线标识、平台推断来源和突变算子摘要
- **AND** Trace MUST 不泄露密钥、真实绝对路径或过长正文

#### Scenario: 路线策略失败
- **WHEN** Skill 无法形成有效路线策略或生成器 payload
- **THEN** Trace MUST 记录失败阶段和可诊断原因
- **AND** AgentPort MUST 返回可被 Growth 领域记录的失败结果
