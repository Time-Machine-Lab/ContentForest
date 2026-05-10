## ADDED Requirements

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
