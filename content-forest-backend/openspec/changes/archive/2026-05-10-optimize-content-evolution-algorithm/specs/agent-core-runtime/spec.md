## ADDED Requirements

### Requirement: Agent Trace 表达算法策略阶段
系统 SHALL 在 Agent 运行追踪中表达内容进化算法相关阶段。Trace MUST 能记录算法模型版本、策略编排、证据组织、LLM 生成、结构化封装、校验和修复等关键阶段，并 MUST 不泄露真实 API Key 或本地绝对路径。

#### Scenario: 枝化生长记录策略阶段
- **WHEN** Agent Runtime 执行 `growth` 类型任务
- **THEN** Trace MUST 能记录策略编排阶段和对应算法模型版本
- **AND** Trace MUST 能区分生成器 payload 生成和候选果实结构化封装阶段

#### Scenario: 基因汲取记录假设生成阶段
- **WHEN** Agent Runtime 执行 `gene_extraction` 类型任务
- **THEN** Trace MUST 能记录证据读取、基因假设生成、结构化校验和修复阶段
- **AND** Trace MUST 能支持后续排查基因建议质量问题

### Requirement: Agent 日志支持算法迭代排查
系统 SHALL 让 Agent 交流日志支持内容进化算法迭代排查。日志 MUST 能在脱敏和裁剪后呈现关键策略输入、LLM 输出摘要、修复原因和最终结构化结果摘要。

#### Scenario: 日志包含策略摘要
- **WHEN** Agent 交流日志开启且执行枝化生长任务
- **THEN** 日志 SHOULD 包含本次 attempt 的策略摘要或探索方向
- **AND** 日志 MUST 不包含真实密钥、真实绝对路径或超出配置上限的长正文

#### Scenario: 日志支持比较不同算法版本
- **WHEN** 后续系统升级内容进化算法模型版本
- **THEN** Agent 日志 MUST 能帮助开发者区分不同版本生成结果
- **AND** 系统 MUST 不要求用户从果实 Markdown 正文中推断算法版本
