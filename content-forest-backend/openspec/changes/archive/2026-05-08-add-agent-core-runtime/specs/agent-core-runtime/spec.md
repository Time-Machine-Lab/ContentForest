## ADDED Requirements

### Requirement: AgentPort 提供底层任务运行入口
系统 SHALL 提供 AgentPort 底层任务运行入口，用于接收 Agent 任务并返回标准化运行结果。该入口 MUST 不直接暴露枝化生长或基因汲取业务专用方法，但任务类型 MUST 限定在第一期允许的能力范围内。

#### Scenario: 运行允许的 Agent 任务
- **WHEN** 后端模块通过 AgentPort 提交允许的 Agent 任务
- **THEN** 系统返回标准化 Agent 运行结果
- **AND** 结果包含成功输出或失败错误

#### Scenario: 拒绝未知任务类型
- **WHEN** 后端模块提交未知 Agent 任务类型
- **THEN** 系统拒绝运行该任务
- **AND** 返回可理解的校验错误

### Requirement: Agent Runtime 执行最小运行链路
系统 SHALL 实现内置 Agent Runtime，用于执行一次 Agent 任务的最小链路。Runtime MUST 支持创建任务上下文、调用 Skill Runtime、执行输出校验、记录运行追踪，并将结果返回给 AgentPort。

#### Scenario: 成功完成一次 Runtime 调用
- **WHEN** Agent Runtime 接收到可运行任务且对应 Skill 返回有效输出
- **THEN** 系统执行输出校验
- **AND** 返回成功结果
- **AND** 记录任务开始、Skill 调用、输出校验和任务完成事件

#### Scenario: Runtime 捕获执行失败
- **WHEN** Skill 调用或输出校验过程中发生失败
- **THEN** 系统返回失败结果
- **AND** 失败结果包含可理解错误信息
- **AND** 运行追踪记录失败原因

### Requirement: Agent 任务上下文表达任务目标与运行输入
系统 SHALL 定义 Agent 任务上下文，用于表达任务类型、任务目标、任务输入、可用上下文和运行约束。任务上下文 MUST 能随任务传递给 Tool 和 Skill。

#### Scenario: 任务上下文传入 Skill
- **WHEN** Runtime 调用 Skill
- **THEN** Skill 可以读取本次任务上下文
- **AND** 任务上下文包含任务类型和任务输入

#### Scenario: 任务上下文传入 Tool
- **WHEN** Skill 通过 Runtime 调用 Tool
- **THEN** Tool 可以接收本次任务上下文
- **AND** Tool 不需要直接访问业务模块状态

### Requirement: Tool Registry 支持注册和查找 Tool
系统 SHALL 提供 Tool Registry，用于注册、查找和列出 Agent 可用 Tool。Tool Registry MUST 支持在测试中注册 Fake Tool，并在查找不存在 Tool 时返回明确错误。

#### Scenario: 注册并查找 Tool
- **WHEN** 系统注册一个 Tool
- **THEN** 可以通过 Tool 名称查找到该 Tool

#### Scenario: 查找不存在的 Tool
- **WHEN** 系统尝试查找未注册 Tool
- **THEN** 返回可理解的 Tool 不存在错误

### Requirement: Tool Runtime 支持只读 Tool 调用底座
系统 SHALL 提供 Tool Runtime，用于集中调用已注册 Tool。第一期 Tool Runtime MUST 支持只读 Tool 语义和调用追踪，但 MUST NOT 实现具体业务读取 Tool。

#### Scenario: 调用已注册 Tool
- **WHEN** Skill 请求调用一个已注册 Tool
- **THEN** Tool Runtime 执行该 Tool
- **AND** 返回 Tool 输出
- **AND** 记录 Tool 调用事件

#### Scenario: Tool 调用失败
- **WHEN** Tool 执行过程中返回失败
- **THEN** Tool Runtime 将失败包装为标准化错误
- **AND** 记录 Tool 调用失败事件

### Requirement: Skill Runtime 支持注册和执行 Skill
系统 SHALL 提供 Skill Runtime，用于注册和执行 Agent Skill。Skill Runtime MUST 支持测试用 Fake Skill，但本次 MUST NOT 实现枝化生长 Skill、基因汲取 Skill 或外部生成器执行逻辑。

#### Scenario: 执行已注册 Skill
- **WHEN** Runtime 根据任务找到已注册 Skill
- **THEN** Skill Runtime 执行该 Skill
- **AND** 将 Skill 输出返回给 Runtime

#### Scenario: 缺少可执行 Skill
- **WHEN** Runtime 无法找到任务对应 Skill
- **THEN** 系统返回可理解的 Skill 不存在错误

### Requirement: LLM Adapter 支持 OpenAI API 兼容调用
系统 SHALL 定义 LLM Adapter 契约，并提供 OpenAI API 兼容实现。真实 LLM Adapter MUST 通过环境变量读取供应商、Base URL、模型和 API Key，且 MUST NOT 在代码、日志、文档或测试中保存真实 API Key。

#### Scenario: 使用完整环境配置创建真实 LLM Adapter
- **WHEN** 环境变量提供供应商、Base URL、模型和 API Key
- **THEN** 系统可以创建 OpenAI API 兼容 LLM Adapter
- **AND** Adapter 使用环境变量中的配置发起模型调用

#### Scenario: 不泄露 API Key
- **WHEN** 系统输出配置提示、错误信息或日志
- **THEN** 输出内容不得包含真实 API Key

### Requirement: 缺少真实 LLM 配置时启动提示
系统 SHALL 在启用真实 LLM Adapter 但缺少必要环境变量时，于启动阶段输出命令行提示。提示 MUST 指出缺少哪些配置项，且 MUST 不打印密钥内容。

#### Scenario: 缺少 API Key 时提示
- **WHEN** 系统启用真实 LLM Adapter 但未配置 API Key
- **THEN** 启动阶段输出缺少 API Key 的提示
- **AND** 真实 Agent 调用不得被标记为可用

#### Scenario: 使用测试替身时允许无 Key 启动
- **WHEN** 系统配置为使用 Fake LLM Adapter
- **THEN** 即使没有真实 API Key 也可以启动测试链路

### Requirement: 输出校验器校验通用 Agent 输出
系统 SHALL 提供通用输出校验器，用于校验 Agent 输出是否为空、是否可用、是否与任务类型匹配。输出校验器 MUST 不校验具体果实结构或基因建议结构。

#### Scenario: 校验有效输出
- **WHEN** Skill 返回非空且匹配任务类型的输出
- **THEN** 输出校验器返回通过结果

#### Scenario: 拒绝空输出
- **WHEN** Skill 返回空输出
- **THEN** 输出校验器返回校验失败
- **AND** Runtime 返回可理解错误

### Requirement: Agent 运行追踪记录关键事件
系统 SHALL 为 Agent Runtime 提供运行追踪能力，记录任务开始、Tool 调用、Skill 调用、LLM 调用、输出校验、任务完成和任务失败等关键事件。

#### Scenario: 成功任务记录 Trace
- **WHEN** Agent 任务成功完成
- **THEN** Trace 中包含任务开始、Skill 调用、输出校验和任务完成事件

#### Scenario: 失败任务记录 Trace
- **WHEN** Agent 任务失败
- **THEN** Trace 中包含失败事件
- **AND** 失败事件包含可用于定位问题的原因说明

### Requirement: 本地密钥文件受到 Git 保护
系统 SHALL 确保本地环境密钥文件不会被提交到 Git。仓库 MAY 提供示例环境文件，但示例文件 MUST 只包含占位符，不得包含真实 API Key。

#### Scenario: 本地 env 文件被忽略
- **WHEN** 开发者在后端目录创建本地 env 文件
- **THEN** 该文件不会出现在待提交文件列表中

#### Scenario: 示例配置不包含真实密钥
- **WHEN** 开发者查看示例环境配置
- **THEN** 示例中只出现占位符
- **AND** 不包含真实 API Key
