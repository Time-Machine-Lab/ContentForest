## Purpose

Defines the nutrient research Agent backend capability, including skill registration, controlled search tool usage, seed or card-scoped research sessions, and candidate nutrient block output.

## Requirements

### Requirement: 注册营养研究 Agent Skill
系统 SHALL 提供内置营养研究 Agent Skill，用于处理 `nutrient_research` 类型任务。该 Skill MUST 支持联网搜索，并返回普通沟通内容和可沉淀营养块。

#### Scenario: 执行营养研究任务
- **WHEN** 用户在营养工作台提交研究问题
- **THEN** 系统 MUST 创建 `nutrient_research` Agent 任务
- **AND** Agent Runtime MUST 调用内置营养研究 Skill

#### Scenario: Agent 输出可沉淀营养块
- **WHEN** 营养研究 Skill 发现可沉淀资料
- **THEN** 输出 MUST 包含可被后端识别的可沉淀营养块
- **AND** 可沉淀营养块 MUST 包含标题和 Markdown 正文

### Requirement: 支持联网搜索 Tool
系统 SHALL 为营养研究 Skill 提供受控联网搜索 Tool。搜索 Tool MUST 记录查询词、结果摘要和失败原因，并 MUST NOT 写数据库或文件。

#### Scenario: 搜索平台资料
- **WHEN** 营养研究 Skill 需要补充平台案例、趋势或表达规律
- **THEN** Skill MUST 通过联网搜索 Tool 获取外部信息
- **AND** Trace MUST 记录搜索调用摘要

#### Scenario: 搜索失败
- **WHEN** 联网搜索失败
- **THEN** 系统 MUST 返回用户可理解的失败原因
- **AND** 系统 MUST 不伪造搜索结果

### Requirement: 维护营养研究会话
系统 SHALL 支持种子级营养研究会话。会话 MUST 归属于明确种子，并 MAY 绑定一张营养卡片。

#### Scenario: 创建种子级研究会话
- **WHEN** 用户首次在营养工作台发起研究
- **THEN** 系统 MUST 创建归属于当前种子的研究会话
- **AND** 系统 MUST 保存用户消息和 Agent 响应

#### Scenario: 卡片会话继续研究
- **WHEN** 用户点击一张营养卡片继续对话
- **THEN** 系统 MUST 加载或创建绑定该卡片的研究会话
- **AND** 后续消息 MUST 追加到该会话

### Requirement: 可沉淀营养块不自动入库
系统 SHALL 将 Agent 生成的可沉淀营养块作为候选内容返回。用户确认前，系统 MUST NOT 将其写入正式营养内容。

#### Scenario: 返回候选块
- **WHEN** Agent 返回可沉淀营养块
- **THEN** 系统 MUST 将其保存或返回为候选块
- **AND** 系统 MUST NOT 自动创建正式营养内容
