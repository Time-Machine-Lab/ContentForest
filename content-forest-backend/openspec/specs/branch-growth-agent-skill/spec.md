## Purpose

定义内置枝化生长 Agent Skill 的注册、生成器读取、受控脚本执行、候选果实结构化输出、Schema 校验、自检修复和运行 Trace 规则。
## Requirements
### Requirement: 注册内置枝化生长 Agent Skill
系统 SHALL 提供内置枝化生长 Agent Skill，用于处理 AgentPort 的 `growth` 类型任务。该 Skill MUST 随后端应用发布并在应用装配时注册到 Agent SkillRegistry，MUST NOT 作为用户上传生成器 Skill 管理。

#### Scenario: 启动时注册内置枝化生长 Skill
- **WHEN** 后端应用装配 Agent Runtime
- **THEN** 系统 MUST 将内置枝化生长 Skill 注册为可执行 `growth` 任务的 Skill
- **AND** 系统 MUST 不要求从生成器文件夹加载该内置 Skill

#### Scenario: Growth 任务命中内置枝化生长 Skill
- **WHEN** Growth 领域通过 AgentPort 提交 `growth` 类型任务
- **THEN** Agent Runtime MUST 调用内置枝化生长 Skill
- **AND** 内置枝化生长 Skill MUST 返回候选果实结构体或标准化失败结果

### Requirement: 动态读取外部生成器 Skill 文件夹
系统 SHALL 允许内置枝化生长 Skill 基于任务中的生成器引用，通过受控 Tool 读取外部生成器 Skill 文件夹。系统 MUST 支持读取 `SKILL.md`、目录清单和必要附件摘要，MUST NOT 把真实绝对路径暴露给模型作为可自由操作输入。

#### Scenario: 读取生成器方法论
- **WHEN** 枝化生长 Skill 开始执行一次候选果实生成
- **THEN** 系统 MUST 通过 Tool 读取本次授权生成器的 `SKILL.md`
- **AND** 系统 MUST 将其作为生成器创作方法论提供给枝化生长 Skill

#### Scenario: 生成器不存在或不可用
- **WHEN** 枝化生长 Skill 请求读取不存在或未授权的生成器
- **THEN** Tool MUST 拒绝读取
- **AND** Agent Runtime MUST 返回可记录为本次果实生成尝试失败的错误

### Requirement: 受控执行生成器 Skill 内 JS 脚本
系统 SHALL 提供受控 Tool，用于在生成器 Skill 声明需要脚本辅助时执行其文件夹内允许的 JS 脚本。该 Tool MUST 限制执行范围、入口文件、超时和输出大小，MUST NOT 允许 Agent 执行任意系统路径或任意命令。

#### Scenario: 执行授权生成器脚本
- **WHEN** 生成器 Skill 需要执行其文件夹内的授权 JS 脚本
- **THEN** 枝化生长 Skill MUST 通过受控 Tool 发起执行
- **AND** Tool MUST 将脚本输出作为生成器 payload 返回

#### Scenario: 拒绝越权脚本执行
- **WHEN** Agent 请求执行生成器文件夹外的脚本或未授权入口
- **THEN** Tool MUST 拒绝执行
- **AND** 系统 MUST 记录该次生成尝试失败原因

#### Scenario: 脚本执行失败
- **WHEN** 生成器脚本超时、异常退出或输出超过限制
- **THEN** Tool MUST 返回标准化失败
- **AND** 枝化生长 Skill MUST 不把该失败结果包装为成功候选果实

### Requirement: 生成器 Skill 只交付内容 payload
系统 SHALL 将外部生成器 Skill 的职责限定为产出内容 payload。生成器 Skill MUST NOT 直接创建果实、维护果实 meta、写入数据库、写入 Markdown 文件或改变 Growth 任务状态。

#### Scenario: 生成器输出 Markdown payload
- **WHEN** 外部生成器 Skill 根据方法论完成内容生成
- **THEN** 系统 MUST 将其结果视为生成器 payload
- **AND** 枝化生长 Skill MUST 负责后续候选果实结构化包装

#### Scenario: 生成器试图声明系统事实
- **WHEN** 生成器输出包含“已保存果实”“已完成任务”等系统事实声明
- **THEN** 枝化生长 Skill MUST 将这些内容视为普通文本或警告
- **AND** 系统 MUST 不因此改变 Growth 或 Fruit 领域状态

### Requirement: 返回结构化候选果实结果
系统 SHALL 要求枝化生长 Skill 的成功输出为结构化候选果实结果。该结果 MUST 包含可落地的果实 Markdown 正文、候选摘要、基因标签集合和使用资源引用信息，MUST NOT 直接保存果实。使用资源引用信息在通过校验后 MUST 统一为标准对象数组，并且 MUST 只能表达本次任务授权范围内的营养内容或基因经验。

#### Scenario: 返回有效候选果实结构
- **WHEN** 枝化生长 Skill 成功完成一次候选果实生成
- **THEN** AgentPort MUST 返回结构化候选果实结果
- **AND** Growth 领域 MUST 能够基于该结果调用 FruitService 创建候选果实
- **AND** 候选果实中的使用资源引用 MUST 已经被归一化为标准对象数组

#### Scenario: 不直接保存果实
- **WHEN** 枝化生长 Skill 生成候选果实结果
- **THEN** 枝化生长 Skill MUST NOT 调用 FruitService
- **AND** 枝化生长 Skill MUST NOT 写入文件或数据库

#### Scenario: 明确提示资源引用结构
- **WHEN** 枝化生长 Skill 请求模型封装候选果实结构
- **THEN** 系统 MUST 在结构化输出提示中明确使用资源引用的标准对象数组格式
- **AND** 系统 MUST 提供可执行的 JSON 示例，避免模型只返回字符串数组

### Requirement: 通过 Tool Calling 约束候选果实提交
系统 SHALL 优先使用 Tool Calling 风格的候选果实提交机制约束模型输出。模型最终 MUST 以候选果实提交工具的参数形式交付结构化结果；如果供应商不支持该机制，系统 MUST 使用等价的结构化解析与本地校验兜底。

#### Scenario: 模型调用候选果实提交工具
- **WHEN** 模型完成候选果实整理
- **THEN** 模型 MUST 提交候选果实结构参数
- **AND** 系统 MUST 对提交参数执行本地 Schema 校验

#### Scenario: 模型返回自由文本
- **WHEN** 模型未按候选果实结构提交结果
- **THEN** 系统 MUST 将该输出视为结构化校验失败
- **AND** 系统 MUST 进入修复流程或标记本次生成尝试失败

### Requirement: 本地 Schema 校验候选果实输出
系统 SHALL 使用本地 Schema 对候选果实结构进行严格校验。校验 MUST 覆盖结构完整性、Markdown 非空、摘要可用、基因标签格式、授权资源引用和禁止系统事实伪造等规则。系统 MAY 在授权范围内归一化模型返回的可确定字符串资源引用，但归一化后的结果 MUST 仍然满足授权资源引用规则。

#### Scenario: 候选果实通过校验
- **WHEN** 枝化生长 Skill 输出完整且可用的候选果实结构
- **THEN** 本地 Schema 校验 MUST 通过
- **AND** AgentPort MUST 将该候选结果返回给 Growth 领域

#### Scenario: Markdown 正文为空
- **WHEN** 候选果实结构中的果实 Markdown 正文为空
- **THEN** 本地 Schema 校验 MUST 失败
- **AND** 系统 MUST 不把该结果交给 Growth 领域落地

#### Scenario: 资源引用越权
- **WHEN** 候选果实结构包含未授权资源引用或真实本地文件路径
- **THEN** 本地 Schema 校验 MUST 失败
- **AND** 系统 MUST 记录可诊断的校验失败原因

#### Scenario: 字符串资源引用可唯一归一化
- **WHEN** 候选果实结构中的使用资源引用以字符串形式出现
- **AND** 该字符串能够在本次任务授权资源集合中唯一匹配到一个资源
- **THEN** 本地 Schema 校验 MUST 将其归一化为标准对象引用
- **AND** AgentPort MUST 只返回归一化后的候选果实结构

#### Scenario: 字符串资源引用不可安全归一化
- **WHEN** 候选果实结构中的字符串资源引用为空、未授权、无法识别或匹配多个授权资源
- **THEN** 本地 Schema 校验 MUST 失败
- **AND** 系统 MUST 不得将该引用静默丢弃后当作有效候选果实返回

### Requirement: 自检修复结构化输出
系统 SHALL 在候选果实结构校验失败时执行有限次数的自检修复。修复流程 MUST 只修复结构化格式和缺失字段，MUST NOT 擅自重新落地果实或改变 Growth 任务状态。修复提示 MUST 包含真实校验错误，并 MUST 引导模型输出符合候选果实结构的单个 JSON 对象。

#### Scenario: 修复后通过校验
- **WHEN** 候选果实首次输出未通过 Schema 校验
- **THEN** 系统 MUST 将真实校验错误反馈给模型或修复器
- **AND** 如果修复后通过校验，系统 MUST 返回修复后的候选果实结构

#### Scenario: 多次修复仍失败
- **WHEN** 候选果实输出在允许修复次数内仍无法通过 Schema 校验
- **THEN** AgentPort MUST 返回失败结果
- **AND** Growth 领域 MUST 能够将该结果记录为本次果实生成尝试失败

#### Scenario: 修复提示不得吞掉校验原因
- **WHEN** 系统发起结构化输出修复
- **THEN** 修复提示 MUST 包含本次失败的具体校验原因
- **AND** Trace MUST 能记录修复前的校验失败摘要

### Requirement: 记录枝化生长 Skill 运行 Trace
系统 SHALL 记录枝化生长 Skill 的关键运行 Trace，包括读取来源节点、读取生成器、执行生成器脚本、提交候选果实、Schema 校验、修复重试和失败原因。Trace MUST NOT 泄露 API Key、真实绝对路径或过长正文。

#### Scenario: 成功生成候选果实时记录 Trace
- **WHEN** 枝化生长 Skill 成功返回候选果实
- **THEN** Trace MUST 包含生成器读取、候选提交和校验通过事件
- **AND** Trace MUST 不包含真实 API Key

#### Scenario: 结构化输出失败时记录 Trace
- **WHEN** 候选果实结构化输出最终失败
- **THEN** Trace MUST 包含校验失败或修复失败原因
- **AND** Trace MUST 能支持开发者定位失败阶段

### Requirement: 枝化生长 Skill 编排生长策略
系统 SHALL 由内置枝化生长 Skill 在生成器 payload 生成前编排生长策略。该策略 MUST 基于授权来源节点、用户输入、生成器方法论、营养资料、基因经验和 attempt 目标形成，并 MUST 作为生成器内容创作的上游约束。

#### Scenario: 生成 payload 前形成策略
- **WHEN** 枝化生长 Skill 已读取本次任务授权上下文
- **THEN** 系统 MUST 在请求生成器产出 payload 前形成本次 attempt 的生长策略
- **AND** 生长策略 MUST 说明本次 attempt 要探索的内容方向

#### Scenario: 策略不替代生成器
- **WHEN** 生长策略已经形成
- **THEN** 外部生成器 Skill 仍 MUST 负责生成内容 payload
- **AND** 枝化生长 Skill MUST 不要求生成器直接返回果实 meta 或系统事实

### Requirement: 使用证据卡片组织资料
系统 SHALL 将授权资料组织为证据卡片后再交给内容生成提示。证据卡片 MUST 包含来源类型、资源引用、相关性摘要和建议用途，并 MUST 避免把全部长文资料无差别拼接到生成器上下文中。

#### Scenario: 营养资料形成证据卡片
- **WHEN** 本次任务授权范围包含营养内容
- **THEN** 枝化生长 Skill MUST 能将营养内容整理为可用于生成的证据卡片
- **AND** 证据卡片 MUST 保留资源引用以便候选果实声明使用来源

#### Scenario: 基因经验形成证据卡片
- **WHEN** 本次任务授权范围包含基因经验
- **THEN** 枝化生长 Skill MUST 能将基因经验整理为继承、变异、组合或规避建议
- **AND** 该建议 MUST 进入本次 attempt 生长策略

### Requirement: 约束生成器 payload 为最终可见内容
系统 SHALL 要求生成器 payload 聚焦最终可见内容。枝化生长 Skill MUST 在提示和后处理上避免把模型思考、候选标题分析、策略分析或系统事实声明混入最终果实正文。

#### Scenario: 清理模型思考内容
- **WHEN** 生成器 payload 中包含模型思考块或明显中间分析
- **THEN** 枝化生长 Skill MUST 在候选果实封装前移除或隔离这些内容
- **AND** 果实 Markdown 正文 MUST 只保留用户可见的发布内容

#### Scenario: 保留必要创作结果
- **WHEN** 生成器 payload 包含标题、正文、标签或平台内容结构
- **THEN** 枝化生长 Skill MUST 保留这些可发布内容
- **AND** 系统 MUST 不因为清理中间分析而破坏正文结构

### Requirement: 候选果实包含策略相关 meta 建议
系统 SHALL 允许候选果实结构中包含策略相关 meta 建议，例如探索方向、基因标签、使用资源引用和 warnings。系统 MUST 保持这些内容为候选 meta，不得让 Agent 声明已保存、已发布或已完成任务等系统事实。

#### Scenario: 返回探索方向摘要
- **WHEN** 枝化生长 Skill 成功返回候选果实
- **THEN** 候选 meta SHOULD 能表达本次果实对应的探索方向或策略摘要
- **AND** Growth 领域 MUST 仍然负责最终落地和系统事实维护

#### Scenario: 拒绝系统事实伪造
- **WHEN** 候选果实结构中声明已保存果实、已完成任务或已发布
- **THEN** 本地校验 MUST 将其视为非法系统事实声明
- **AND** 系统 MUST 进入修复流程或标记本次尝试失败

### Requirement: 记录策略编排 Trace
系统 SHALL 为枝化生长 Skill 记录策略编排 Trace。Trace MUST 包含算法模型版本、证据组织、探索方向、生成器 payload 生成、候选封装和校验结果的阶段信息。

#### Scenario: 成功任务记录策略阶段
- **WHEN** 枝化生长 Skill 成功完成一次候选果实生成
- **THEN** Trace MUST 包含策略编排完成事件
- **AND** Trace MUST 能说明本次 attempt 的探索方向摘要

#### Scenario: 策略失败记录原因
- **WHEN** 策略编排无法形成有效输出
- **THEN** Trace MUST 记录策略失败原因
- **AND** AgentPort MUST 返回可被 Growth 领域记录的失败结果

