## ADDED Requirements

### Requirement: Agent Runtime 支持联网研究类 Tool 的受控调用
系统 SHALL 允许 Agent Runtime 注册和调用联网研究类 Tool。联网研究类 Tool MUST 遵守任务上下文、运行约束、超时限制和 Trace 记录规则，并 MUST 将外部依赖失败包装为标准 Agent Tool 错误。

#### Scenario: 调用已注册的联网研究 Tool
- **WHEN** Agent Skill 请求调用已注册的联网研究 Tool
- **THEN** Agent Runtime MUST 通过 Tool Runtime 执行该 Tool
- **AND** Tool 输出 MUST 以标准 ToolOutput 返回给 Skill

#### Scenario: 联网研究 Tool 调用失败
- **WHEN** 联网研究 Tool 因外部服务、浏览器环境或配置缺失失败
- **THEN** Agent Runtime MUST 将失败包装为标准化 Tool 错误
- **AND** Trace MUST 记录可诊断但不泄露密钥的失败原因

### Requirement: Agent Runtime 不向 Skill 泄露外部 Provider 密钥
系统 SHALL 由 Tool 或 Provider 适配器读取外部搜索、抓取和浏览器配置。Agent Skill MUST NOT 直接接收 API Key、浏览器登录态、本地 Profile 路径或外部服务密钥。

#### Scenario: Skill 请求联网研究
- **WHEN** Skill 调用联网研究 Tool
- **THEN** Skill 只能提供研究请求、查询规划参数或平台意图
- **AND** 系统 MUST NOT 将真实 Provider 密钥传入 Skill 输入

#### Scenario: 记录配置错误
- **WHEN** Provider 因缺少 API Key 或 CLI 环境不可用而失败
- **THEN** 系统 MUST 返回缺少配置的可理解原因
- **AND** 系统 MUST 不输出真实密钥值

### Requirement: Agent Trace 支持联网研究阶段
系统 SHALL 在 Agent Trace 中表达联网研究相关阶段。Trace MUST 能区分查询规划、Provider 路由、Provider 调用、结果归一化、降级和 Agent 总结阶段。

#### Scenario: 记录联网研究阶段
- **WHEN** Agent 执行包含联网研究的任务
- **THEN** Trace MUST 包含联网研究阶段事件
- **AND** Trace MUST 能帮助区分搜索失败、抓取失败、浏览器失败和 Agent 总结失败

#### Scenario: 联网研究 Trace 脱敏
- **WHEN** Trace 记录 Provider 输入与输出摘要
- **THEN** Trace MUST 不包含真实 API Key、登录 Cookie、本地绝对路径或超出配置上限的原始正文
