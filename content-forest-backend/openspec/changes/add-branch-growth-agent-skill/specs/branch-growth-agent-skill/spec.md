## ADDED Requirements

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
系统 SHALL 要求枝化生长 Skill 的成功输出为结构化候选果实结果。该结果 MUST 包含可落地的果实 Markdown 正文、候选摘要、基因标签集合和使用资源引用信息，MUST NOT 直接保存果实。

#### Scenario: 返回有效候选果实结构
- **WHEN** 枝化生长 Skill 成功完成一次候选果实生成
- **THEN** AgentPort MUST 返回结构化候选果实结果
- **AND** Growth 领域 MUST 能够基于该结果调用 FruitService 创建候选果实

#### Scenario: 不直接保存果实
- **WHEN** 枝化生长 Skill 生成候选果实结果
- **THEN** 枝化生长 Skill MUST NOT 调用 FruitService
- **AND** 枝化生长 Skill MUST NOT 写入文件或数据库

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
系统 SHALL 使用本地 Schema 对候选果实结构进行严格校验。校验 MUST 覆盖结构完整性、Markdown 非空、摘要可用、基因标签格式、授权资源引用和禁止系统事实伪造等规则。

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

### Requirement: 自检修复结构化输出
系统 SHALL 在候选果实结构校验失败时执行有限次数的自检修复。修复流程 MUST 只修复结构化格式和缺失字段，MUST NOT 擅自重新落地果实或改变 Growth 任务状态。

#### Scenario: 修复后通过校验
- **WHEN** 候选果实首次输出未通过 Schema 校验
- **THEN** 系统 MUST 将校验错误反馈给模型或修复器
- **AND** 如果修复后通过校验，系统 MUST 返回修复后的候选果实结构

#### Scenario: 多次修复仍失败
- **WHEN** 候选果实输出在允许修复次数内仍无法通过校验
- **THEN** AgentPort MUST 返回失败结果
- **AND** Growth 领域 MUST 能够将该结果记录为本次果实生成尝试失败

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
