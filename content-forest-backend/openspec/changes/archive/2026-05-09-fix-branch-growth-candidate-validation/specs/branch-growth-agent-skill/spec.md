## MODIFIED Requirements

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
