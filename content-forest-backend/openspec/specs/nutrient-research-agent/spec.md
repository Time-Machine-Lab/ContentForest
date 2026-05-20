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
系统 SHALL 支持种子级营养研究会话。会话 MUST 归属于明确种子，MUST NOT 绑定营养内容或营养卡片。会话中的 Agent 输出可以产生可沉淀营养块，但这些候选块只有在用户显式保存为新草稿或合并到指定营养内容后，才进入营养内容生命周期。

#### Scenario: 创建种子级研究会话
- **WHEN** 用户首次在营养工作台发起研究
- **THEN** 系统 MUST 创建归属于当前种子的研究会话
- **AND** 系统 MUST 保存用户消息和 Agent 响应
- **AND** 系统 MUST NOT 要求或保存营养内容标识

#### Scenario: 在已有会话中继续研究
- **WHEN** 用户选择某个历史研究会话并继续发送消息
- **THEN** 系统 MUST 将后续消息追加到该会话
- **AND** 系统 MUST NOT 基于营养内容查找、创建或绑定会话

#### Scenario: 会话产出多个候选营养块
- **WHEN** 营养研究 Skill 在同一会话中产出多个可沉淀营养块
- **THEN** 系统 MUST 将它们作为独立候选块返回或保存
- **AND** 系统 MUST NOT 自动决定它们应合并到哪个营养内容

### Requirement: 可沉淀营养块不自动入库
系统 SHALL 将 Agent 生成的可沉淀营养块作为候选内容返回。用户确认前，系统 MUST NOT 将其写入正式营养内容。

#### Scenario: 返回候选块
- **WHEN** Agent 返回可沉淀营养块
- **THEN** 系统 MUST 将其保存或返回为候选块
- **AND** 系统 MUST NOT 自动创建正式营养内容

### Requirement: 营养研究 Agent 必须暴露可观察对话事件
系统 SHALL 让营养研究 Agent 在执行过程中暴露可观察事件，供营养研究 SSE 接口转发为用户可理解的对话流。

#### Scenario: LLM 流式输出普通内容
- **WHEN** 营养研究 Skill 调用支持流式输出的 LLM
- **THEN** Agent MUST 将普通内容片段转化为 `message_delta` 类型事件
- **AND** Agent MUST 在最终结果中继续返回可校验的结构化输出

#### Scenario: LLM 流式输出思考内容
- **WHEN** LLM provider 返回 reasoning 或 thinking 片段
- **THEN** Agent MUST 将该片段转化为 `thought_delta` 类型事件
- **AND** Agent MUST 不从普通正文中推断或伪造思考内容

#### Scenario: Agent 调用联网研究工具
- **WHEN** 营养研究 Skill 调用联网搜索、外部研究 provider 或其他工具
- **THEN** Agent MUST 发出工具开始、工具进度、工具完成或工具失败的可观察事件
- **AND** 工具事件 MUST 使用脱敏摘要描述工具行为

### Requirement: 营养研究 Agent 必须支持取消信号
系统 SHALL 允许营养研究 Agent 接收取消信号，并将其传递给支持取消的 LLM Adapter 和 Tool Provider。

#### Scenario: 取消正在运行的 LLM 请求
- **WHEN** 应用层在 LLM 流式请求未完成时发出取消信号
- **THEN** Agent MUST 将取消信号传递给 LLM Adapter
- **AND** LLM Adapter MUST 尽力终止正在进行的 provider 请求

#### Scenario: 取消正在运行的工具请求
- **WHEN** 应用层在工具运行中发出取消信号
- **THEN** Agent MUST 将取消信号传递给支持取消的 Tool Provider
- **AND** 不支持取消的 Tool Provider MUST 不阻塞事件流的关闭

### Requirement: 营养研究 Skill 必须区分 TikHub 实采和 Codex 深研
系统 SHALL 要求营养研究 Skill 根据来源类型生成普通回复和可沉淀营养块。Skill MUST 区分 TikHub MCP 实采平台证据、Codex 候选线索、Codex 综合分析和受限状态，MUST NOT 将 Codex 推断表述为任一社媒平台的原始帖子数据。

#### Scenario: 使用 TikHub Twitter 实采证据生成营养
- **WHEN** 联网研究结果包含 TikHub Twitter/X `complete_observed_case`
- **THEN** Skill MAY 基于这些实采帖子总结产品定位、卖点表达、互动信号和传播角度
- **AND** Skill MUST 在可沉淀营养块中保留来源摘要或来源引用

#### Scenario: 使用 TikHub 其他平台实采证据生成营养
- **WHEN** 联网研究结果包含 TikHub 非小红书平台 `complete_observed_case`
- **THEN** Skill MAY 基于对应平台帖子总结平台语气、内容结构、互动信号和跨平台差异
- **AND** Skill MUST 标明平台来源和采集限制

#### Scenario: 使用 Codex 深研补充
- **WHEN** 联网研究结果包含 Codex 深研补充
- **THEN** Skill MUST 将其作为背景、候选线索或综合分析使用
- **AND** Skill MUST NOT 把 Codex 内容写成 TikHub 实采帖子事实

### Requirement: 营养研究输出必须表达 TikHub 采集限制
系统 SHALL 要求营养研究输出包含必要的 TikHub 采集限制说明。当 TikHub Provider 返回 key 缺失、额度不足、平台不支持、平台能力不足、工具不可用、session 失效或空结果时，Skill MUST 向用户说明限制，并基于可用证据谨慎生成建议。

#### Scenario: TikHub 采集受限
- **WHEN** 联网研究包包含 TikHub 受限状态
- **THEN** Skill MUST 在回复中说明受限原因
- **AND** Skill MUST NOT 基于受限状态编造帖子、作者或互动数据

### Requirement: 多平台营养块必须沉淀可迁移打法
系统 SHALL 要求可沉淀营养块从多平台证据中提炼可复用创作营养。营养块 MUST 优先沉淀平台语气、卖点表达、内容结构、评论语言、互动信号、跨平台差异和可迁移打法，MUST NOT 只是无加工地罗列帖子。

#### Scenario: 从 Twitter AI 产品帖子提炼营养
- **WHEN** TikHub MCP 返回 5 条 Twitter/X AI 产品相关完整帖子证据
- **THEN** Skill MUST 总结这些帖子对当前种子或 AI 产品传播的可迁移启发
- **AND** Skill MUST 保留足够的证据引用，便于用户回看来源

