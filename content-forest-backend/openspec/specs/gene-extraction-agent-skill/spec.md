## Purpose

定义内置基因汲取 Agent Skill 的注册、证据与种子上下文读取、既有基因经验引用、结构化建议生成、Schema 校验、自检修复和运行 Trace 规则。
## Requirements
### Requirement: 注册内置基因汲取 Agent Skill
系统 SHALL 提供内置基因汲取 Agent Skill，用于处理 AgentPort 的 `gene_extraction` 类型任务。该 Skill MUST 随后端应用发布并在应用装配时注册到 Agent SkillRegistry，MUST NOT 作为用户上传生成器 Skill 管理。

#### Scenario: 启动时注册内置基因汲取 Skill
- **WHEN** 后端应用装配 Agent Runtime
- **THEN** 系统 MUST 将内置基因汲取 Skill 注册为可执行 `gene_extraction` 任务的 Skill
- **AND** 系统 MUST 不要求从生成器文件夹加载该内置 Skill

#### Scenario: 基因汲取任务命中内置 Skill
- **WHEN** 基因汲取领域通过 AgentPort 提交 `gene_extraction` 类型任务
- **THEN** Agent Runtime MUST 调用内置基因汲取 Skill
- **AND** 内置基因汲取 Skill MUST 返回结构化基因建议结果或标准化失败结果

### Requirement: 读取基因汲取任务种子上下文
系统 SHALL 提供只读 Tool，用于读取本次基因汲取任务所属种子的上下文。该 Tool MUST 只允许读取任务输入中明确归属的种子，MUST NOT 暴露真实本地绝对路径。

#### Scenario: 读取授权种子上下文
- **WHEN** 基因汲取 Skill 需要理解本次汲取所属种子的目标和内容背景
- **THEN** 系统 MUST 通过只读 Tool 读取授权种子的标题和 Markdown 正文
- **AND** Tool 返回内容中 MUST 不包含真实本地绝对路径

#### Scenario: 拒绝读取非任务种子
- **WHEN** Agent 请求读取不属于本次任务的种子
- **THEN** Tool MUST 拒绝读取
- **AND** Agent Runtime MUST 返回可诊断的失败原因

### Requirement: 读取基因汲取证据上下文
系统 SHALL 提供只读 Tool，用于读取本次任务证据来源对应的上下文。第一版系统 MUST 支持读取果实选择证据、果实淘汰证据和发布验证证据，MUST NOT 读取未出现在任务证据来源中的对象。

#### Scenario: 读取果实选择证据
- **WHEN** 证据来源包含 `fruit_selected`
- **THEN** Tool MUST 读取对应果实的系统 meta 和 Markdown 正文
- **AND** Tool MUST 将该证据标识为正向弱证据

#### Scenario: 读取果实淘汰证据
- **WHEN** 证据来源包含 `fruit_eliminated`
- **THEN** Tool MUST 读取对应果实的系统 meta 和 Markdown 正文
- **AND** Tool MUST 将该证据标识为反向弱证据

#### Scenario: 读取发布验证证据
- **WHEN** 证据来源包含 `publication`
- **THEN** Tool MUST 读取对应发布记录的发布目标、发布凭证、发布备注和发布时间
- **AND** Tool MUST 不推断该发布记录的表现好坏

#### Scenario: 暂不读取反馈快照证据
- **WHEN** 证据来源包含尚未接入的数据回流或反馈快照证据
- **THEN** 系统 MUST 返回明确的暂不支持信息
- **AND** 系统 MUST 不伪造反馈数据

### Requirement: 读取既有可引用基因经验
系统 SHALL 提供只读 Tool，用于读取本次任务输入中列出的可引用基因经验正文。Tool MUST 只读取同一种子下未归档且被任务输入列出的基因经验。

#### Scenario: 读取可引用基因经验正文
- **WHEN** 基因汲取 Skill 需要判断新建议与既有基因经验的关系
- **THEN** Tool MUST 读取任务输入中 `referableGeneInsights` 对应的基因经验 Markdown 正文
- **AND** Tool MUST 返回标题、谱系、生态位和正文摘要或正文内容

#### Scenario: 排除未授权或已归档经验
- **WHEN** Agent 请求读取未出现在任务输入中的基因经验或已归档经验
- **THEN** Tool MUST 拒绝读取或忽略该经验
- **AND** Tool MUST 不返回其他种子的基因经验

### Requirement: 保留营养库读取占位
系统 SHALL 在基因汲取 Skill 设计中保留营养库读取扩展点，但本变更 MUST NOT 实现营养库读取 Tool。营养库读取能力 MUST 等待营养库模块完成后通过后续变更接入。

#### Scenario: 基因汲取 Skill 不依赖营养库 Tool
- **WHEN** 当前系统执行基因汲取任务
- **THEN** 基因汲取 Skill MUST 不要求营养库 Tool 存在
- **AND** 系统 MUST 不因为营养库读取未完成而阻塞果实、发布和基因经验证据汲取

### Requirement: 生成正向和反向基因建议
系统 SHALL 要求基因汲取 Skill 在结构化分析中区分正向基因与反向基因。正向基因表示值得保留、强化或复用的表达特征；反向基因表示应该规避、抑制或避免复现的表达特征。

#### Scenario: 从选择证据生成正向基因建议
- **WHEN** 本次证据主要来自已选择果实
- **THEN** Skill MUST 优先分析可保留和可强化的有效表达特征
- **AND** 输出建议 MUST 明确标识正向基因语义

#### Scenario: 从淘汰证据生成反向基因建议
- **WHEN** 本次证据主要来自已淘汰果实
- **THEN** Skill MUST 优先分析应避免或抑制的无效表达特征
- **AND** 输出建议 MUST 明确标识反向基因语义

#### Scenario: 混合证据生成双向判断
- **WHEN** 本次证据同时包含正向和反向线索
- **THEN** Skill MUST 区分哪些特征应保留，哪些特征应规避
- **AND** Skill MUST 不把淘汰证据误判为成功经验

### Requirement: 限制单次基因建议数量
系统 SHALL 限制一次基因汲取任务返回 1 到 3 条基因建议。Skill MUST 优先保留最有证据支撑、最适合后续枝化生长复用的建议。

#### Scenario: 返回有效建议数量
- **WHEN** 基因汲取 Skill 成功生成建议
- **THEN** 输出 MUST 包含 1 到 3 条建议
- **AND** 每条建议 MUST 有非空标题和非空 Markdown 正文

#### Scenario: 模型返回过多建议
- **WHEN** 模型输出超过 3 条建议
- **THEN** 系统 MUST 将其视为结构校验失败
- **AND** 系统 MUST 进入修复流程并要求保留最有价值的 1 到 3 条建议

### Requirement: 提示相似基因关系但不自动合并
系统 SHALL 允许基因汲取 Skill 判断新建议与既有基因经验的相似关系。该关系 MAY 包括新增、强化、分叉或冲突，但系统 MUST NOT 自动合并、修改或删除既有基因经验。

#### Scenario: 标注与既有基因相似关系
- **WHEN** Skill 发现新建议与既有基因经验相关
- **THEN** 输出建议 MUST 在正文或证据解释中说明相似关系
- **AND** 输出 MUST 保留给用户确认、编辑或放弃

#### Scenario: 不自动合并相似基因
- **WHEN** Skill 判断新建议强化或冲突于既有基因经验
- **THEN** 系统 MUST NOT 自动修改既有基因经验
- **AND** 系统 MUST NOT 自动确认新建议

### Requirement: 返回可由基因领域消费的结构化建议
系统 SHALL 要求基因汲取 Skill 的成功输出能被现有基因领域服务归一化为 `suggestions` 数组。每条建议 MUST 至少包含标题和 Markdown 正文，并 SHOULD 在正文或证据解释中包含正向/反向语义、证据依据和相似基因关系。

#### Scenario: 返回有效结构化建议
- **WHEN** 基因汲取 Skill 完成一次分析
- **THEN** AgentPort MUST 返回可归一化为 `suggestions` 数组的结构化结果
- **AND** 基因领域服务 MUST 能将其保存为待确认基因建议

#### Scenario: 不直接写入基因库
- **WHEN** 基因汲取 Skill 生成建议
- **THEN** Skill MUST NOT 写入基因库 Markdown
- **AND** Skill MUST NOT 创建、确认、编辑或归档基因经验

### Requirement: 自检修复基因建议输出
系统 SHALL 对基因汲取 Skill 输出执行本地 Schema 校验，并在校验失败时执行有限次数的结构修复。修复流程 MUST 只修复结构、数量和缺失字段，MUST NOT 擅自执行业务落地。

#### Scenario: 修复后通过校验
- **WHEN** 模型首次输出无法通过基因建议 Schema 校验
- **THEN** 系统 MUST 将校验错误反馈给模型或修复器
- **AND** 如果修复后通过校验，系统 MUST 返回修复后的建议结果

#### Scenario: 修复失败后返回失败
- **WHEN** 输出在允许修复次数内仍无法通过校验
- **THEN** AgentPort MUST 返回失败结果
- **AND** 基因领域服务 MUST 能将汲取任务标记为失败

### Requirement: 记录基因汲取 Skill 运行 Trace
系统 SHALL 记录基因汲取 Skill 的关键运行 Trace，包括读取种子上下文、读取证据、读取既有基因经验、生成建议、Schema 校验、修复重试和失败原因。Trace MUST NOT 泄露 API Key、真实绝对路径或过长正文。

#### Scenario: 成功生成建议时记录 Trace
- **WHEN** 基因汲取 Skill 成功返回建议
- **THEN** Trace MUST 包含证据读取、建议生成和校验通过事件
- **AND** Trace MUST 不包含真实 API Key 或真实本地绝对路径

#### Scenario: 输出失败时记录 Trace
- **WHEN** 基因建议结构化输出最终失败
- **THEN** Trace MUST 包含校验失败或修复失败原因
- **AND** Trace MUST 能支持开发者定位失败阶段

### Requirement: 基因汲取 Skill 提取可验证基因假设
系统 SHALL 要求内置基因汲取 Skill 输出可验证的基因假设建议。每条建议 MUST 基于证据上下文生成，并 MUST 区分特征内容、作用方向、适用生态位、证据解释和下一轮使用建议。

#### Scenario: 从正向证据提取成功因子
- **WHEN** 基因汲取任务包含选择、发布或高表现反馈等正向证据
- **THEN** Skill MUST 提取可继承、强化、组合或变异的成功因子建议
- **AND** 建议 MUST 说明该因子为什么可能有效

#### Scenario: 从负向证据提取失败因子
- **WHEN** 基因汲取任务包含淘汰或低表现反馈等负向证据
- **THEN** Skill MUST 提取需要规避、抑制或谨慎使用的失败因子建议
- **AND** 建议 MUST 说明该因子在哪些上下文中可能无效

### Requirement: 基因汲取输出包含证据强度语义
系统 SHALL 允许基因汲取 Skill 在建议中表达证据强度或置信语义。证据强度 MUST 基于证据类型和证据数量描述，MUST 不伪造不存在的平台数据。

#### Scenario: 只有人为选择证据
- **WHEN** 本次汲取只有果实被选择或淘汰的证据
- **THEN** Skill MUST 将其视为人工判断证据
- **AND** Skill MUST 不把它夸大为平台验证结果

#### Scenario: 包含发布反馈数据
- **WHEN** 本次汲取包含发布记录和数据快照证据
- **THEN** Skill MUST 能在建议中说明该反馈数据如何支撑或削弱某个基因假设
- **AND** Skill MUST 不伪造数据快照中不存在的指标

### Requirement: 基因汲取建议面向策略复用
系统 SHALL 要求基因汲取 Skill 输出能被枝化生长策略复用的建议。建议 MUST 包含面向下一轮生长的操作性表达，而不是只输出抽象结论。

#### Scenario: 输出可复用操作建议
- **WHEN** Skill 生成一条基因建议
- **THEN** 建议 MUST 说明下一轮生长应如何使用该基因
- **AND** 建议 MUST 能被枝化生长 Skill 转化为继承、变异、组合或规避策略

#### Scenario: 避免泛化空话
- **WHEN** 模型输出缺少具体表达特征或下一轮使用方式
- **THEN** 本地校验或修复流程 SHOULD 要求模型补足这些内容
- **AND** 系统 MUST 不优先保留无法指导下一轮生长的泛化建议

