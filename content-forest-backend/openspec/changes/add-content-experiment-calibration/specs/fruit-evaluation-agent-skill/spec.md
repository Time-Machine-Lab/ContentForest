## ADDED Requirements

### Requirement: 注册内置果实评测 Agent Skill
系统 SHALL 提供内置果实评测 Agent Skill，用于处理 AgentPort 的 `fruit_evaluation` 类型任务。该 Skill MUST 随后端应用发布并在应用装配时注册到 Agent SkillRegistry，MUST NOT 作为用户上传生成器 Skill 管理。

#### Scenario: 启动时注册内置果实评测 Skill
- **WHEN** 后端应用装配 Agent Runtime
- **THEN** 系统 MUST 将内置果实评测 Skill 注册为可执行 `fruit_evaluation` 任务的 Skill
- **AND** 系统 MUST 不要求从生成器文件夹加载该内置 Skill

#### Scenario: 果实评测任务命中内置 Skill
- **WHEN** 内容实验校准领域通过 AgentPort 提交 `fruit_evaluation` 类型任务
- **THEN** Agent Runtime MUST 调用内置果实评测 Skill
- **AND** 内置果实评测 Skill MUST 返回结构化预测图候选或标准化失败结果

### Requirement: 读取授权果实与评分画像
系统 SHALL 为果实评测 Skill 提供只读 Tool，用于读取本次任务授权果实正文、果实系统事实和评分画像。Tool MUST 只允许读取任务输入中的果实和画像，不得暴露真实本地绝对路径。

#### Scenario: 读取授权果实正文
- **WHEN** 果实评测 Skill 需要评测某个果实
- **THEN** 系统 MUST 通过只读 Tool 读取该果实 Markdown 正文和必要系统事实
- **AND** Tool 返回内容 MUST 不包含真实本地绝对路径

#### Scenario: 读取授权评分画像
- **WHEN** 果实评测 Skill 需要判断评测维度和表现区间
- **THEN** 系统 MUST 通过只读 Tool 读取本次任务授权的评分画像
- **AND** Skill MUST 基于该画像生成预测图候选

#### Scenario: 拒绝读取非任务果实
- **WHEN** Agent 请求读取不属于本次任务的果实
- **THEN** Tool MUST 拒绝读取
- **AND** Agent Runtime MUST 返回可诊断的失败原因

### Requirement: 执行盲评边界
系统 SHALL 要求果实评测 Skill 遵守盲评边界。Skill MUST NOT 读取该果实的发布后表现、反馈快照、校准复盘、历史预测复盘或任何会泄露真实表现的数据。

#### Scenario: 拒绝污染数据读取
- **WHEN** Agent 请求读取发布记录表现、反馈快照或校准复盘
- **THEN** Tool MUST 拒绝读取
- **AND** 盲评状态 MUST 记录该次越界请求或失败原因

#### Scenario: 任务输入不包含真实表现提示
- **WHEN** 内容实验校准领域提交 `fruit_evaluation` 任务
- **THEN** 任务输入 MUST 不包含播放量、点赞量、评论量、实际表现、复盘结论或类似污染提示
- **AND** Skill MUST 只基于果实内容和评分画像进行判断

### Requirement: 参考 cheat-on-content 结构化评测方式
系统 SHALL 将 `cheat-on-content` 的 `cheat-score` 与 `cheat-score-blind` 思路改造成后端内置 Skill 行为：结构化维度判断、单行理由、置信度、自检污染信号和严格 JSON 输出。

#### Scenario: 输出结构化评测维度
- **WHEN** Skill 评测果实内容
- **THEN** Skill MUST 输出能映射到预测图的结构化判断
- **AND** 每个关键判断 SHOULD 带有来自果实正文或评分画像的简短理由

#### Scenario: 执行污染自检
- **WHEN** Skill 完成预测图候选输出
- **THEN** 输出 MUST 包含盲评自检状态
- **AND** 如果发现污染信号，系统 MUST 降低置信度或拒绝落地

### Requirement: 返回结构化预测图候选
系统 SHALL 要求果实评测 Skill 的成功输出为结构化预测图候选。候选 MUST 包含评测判断、强点、风险、预期表现区间、核心赌注、反事实场景、推荐观察指标、历史锚点、置信度和盲评状态。

#### Scenario: 返回有效预测图候选
- **WHEN** Skill 成功完成一次果实评测
- **THEN** AgentPort MUST 返回结构化预测图候选
- **AND** 内容实验校准领域 MUST 能基于该候选保存预测图

#### Scenario: 不直接保存预测图
- **WHEN** Skill 生成预测图候选
- **THEN** Skill MUST NOT 写入数据库
- **AND** Skill MUST NOT 修改果实 Markdown 或果实系统事实

### Requirement: 本地 Schema 校验预测图候选
系统 SHALL 使用本地 Schema 对预测图候选进行严格校验。校验 MUST 覆盖字段完整性、枚举值、数组上限、非承诺表达、盲评状态和禁止系统事实伪造等规则。

#### Scenario: 候选通过校验
- **WHEN** Skill 输出完整且可用的预测图候选
- **THEN** 本地 Schema 校验 MUST 通过
- **AND** AgentPort MUST 将候选结果返回给内容实验校准领域

#### Scenario: 候选缺少核心赌注
- **WHEN** 预测图候选缺少核心赌注
- **THEN** 本地 Schema 校验 MUST 失败
- **AND** 系统 MUST 不保存该预测图

#### Scenario: 候选包含承诺式预测
- **WHEN** 预测图候选包含保证命中、必然爆发或真实平台算法模拟声明
- **THEN** 本地 Schema 校验 MUST 失败
- **AND** 系统 MUST 进入修复流程或返回评测失败

### Requirement: 自检修复预测图候选
系统 SHALL 在预测图候选结构校验失败时执行有限次数的自检修复。修复流程 MUST 只修复结构化格式、缺失字段和边界表达，不得擅自读取额外上下文或改写果实。

#### Scenario: 修复后通过校验
- **WHEN** 预测图候选首次输出未通过 Schema 校验
- **THEN** 系统 MUST 将真实校验错误反馈给模型或修复器
- **AND** 如果修复后通过校验，系统 MUST 返回修复后的预测图候选

#### Scenario: 多次修复仍失败
- **WHEN** 输出在允许修复次数内仍无法通过校验
- **THEN** AgentPort MUST 返回失败结果
- **AND** 内容实验校准领域 MUST 不创建预测图记录

### Requirement: 记录果实评测 Skill Trace
系统 SHALL 记录果实评测 Skill 的关键运行 Trace，包括读取果实、读取评分画像、盲评检查、生成预测图候选、Schema 校验、修复重试和失败原因。Trace MUST NOT 泄露 API Key、真实绝对路径或过长正文。

#### Scenario: 成功生成预测图候选时记录 Trace
- **WHEN** 果实评测 Skill 成功返回预测图候选
- **THEN** Trace MUST 包含果实读取、画像读取、盲评检查和校验通过事件
- **AND** Trace MUST 不包含真实 API Key 或真实本地绝对路径

#### Scenario: 输出失败时记录 Trace
- **WHEN** 预测图候选结构化输出最终失败
- **THEN** Trace MUST 包含校验失败或修复失败原因
- **AND** Trace MUST 能支持开发者定位失败阶段
