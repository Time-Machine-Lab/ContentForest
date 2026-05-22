## ADDED Requirements

### Requirement: Agent Runtime 支持果实评测任务
系统 SHALL 允许 Agent Runtime 执行内容实验校准领域提交的 `fruit_evaluation` 类型任务。该任务类型 MUST 只能由后端内容实验校准领域通过 AgentPort 提交，MUST 返回标准化 Agent 运行结果。

#### Scenario: 运行果实评测任务
- **WHEN** 内容实验校准领域通过 AgentPort 提交 `fruit_evaluation` 类型任务
- **THEN** Agent Runtime MUST 将该任务识别为允许的任务类型
- **AND** Runtime MUST 调用已注册的果实评测 Skill
- **AND** Runtime MUST 返回成功输出或失败错误

#### Scenario: 果实评测 Skill 未注册
- **WHEN** Runtime 接收到 `fruit_evaluation` 任务但找不到对应 Skill
- **THEN** 系统 MUST 返回可理解的 Skill 不存在错误
- **AND** Trace MUST 记录任务失败原因

### Requirement: Agent Trace 表达果实评测阶段
系统 SHALL 在 Agent 运行追踪中表达果实评测相关阶段。Trace MUST 能区分果实读取、评分画像读取、盲评边界检查、LLM 评测、结构化候选提交、Schema 校验、修复和任务完成阶段。

#### Scenario: 成功果实评测记录阶段
- **WHEN** Agent Runtime 执行 `fruit_evaluation` 类型任务并成功完成
- **THEN** Trace MUST 包含盲评边界检查和结构化校验阶段
- **AND** Trace MUST 能说明本次评测使用的画像版本

#### Scenario: 果实评测 Trace 脱敏
- **WHEN** Trace 记录果实评测输入与输出摘要
- **THEN** Trace MUST 不包含真实 API Key、真实绝对路径、发布后真实表现数据或超出配置上限的果实正文

### Requirement: Agent Runtime 不向果实评测 Skill 泄露表现数据
系统 SHALL 由内容实验校准领域和只读 Tool 控制果实评测 Skill 的上下文。Agent Runtime MUST NOT 将发布记录表现、反馈快照、校准复盘、历史预测结果或本地路径作为 `fruit_evaluation` 任务上下文传入 Skill。

#### Scenario: 提交果实评测任务上下文
- **WHEN** 内容实验校准领域提交 `fruit_evaluation` 任务
- **THEN** Runtime 传入 Skill 的上下文 MUST 只包含任务类型、果实引用、评分画像引用和运行约束
- **AND** Runtime MUST NOT 附带该果实的真实平台表现或复盘结论

#### Scenario: 记录污染输入错误
- **WHEN** `fruit_evaluation` 任务输入包含真实表现或复盘提示
- **THEN** Runtime 或任务校验器 MUST 拒绝运行该任务
- **AND** 失败信息 MUST 可理解但不泄露敏感数据
