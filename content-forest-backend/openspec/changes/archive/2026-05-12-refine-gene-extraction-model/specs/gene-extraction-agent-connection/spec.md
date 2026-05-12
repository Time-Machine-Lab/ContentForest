## ADDED Requirements

### Requirement: Agent 输入契约支持原因版本化
系统 SHALL 为基因汲取 Agent 输入保留原因信息与上下文版本。输入契约 MUST 能够区分本次任务的用户原因、证据来源与任务版本。

#### Scenario: 输入包含用户原因版本
- **WHEN** 基因汲取领域服务构造 Agent 输入
- **THEN** 输入 MUST 包含当前用户原因与上下文版本
- **AND** 输入 MUST 保留证据来源与任务关联信息

#### Scenario: 输入结构演进
- **WHEN** 后续需要扩展基因汲取输入语义
- **THEN** 系统 MUST 能在不破坏旧任务的前提下演进输入契约

### Requirement: Agent 输出必须可解释并可归类
系统 SHALL 要求 Agent 输出能够被归类为候选建议集合。每条建议 MUST 至少包含标题、正文与证据解释，并 SHOULD 标明正向或负向语义。

#### Scenario: 输出为候选建议集合
- **WHEN** Agent 成功返回基因汲取结果
- **THEN** 系统 MUST 能将结果归类为候选建议集合

#### Scenario: 输出包含解释信息
- **WHEN** Agent 返回单条基因建议
- **THEN** 该建议 MUST 包含可读的证据解释
- **AND** 该建议 SHOULD 标明其正向或负向语义

### Requirement: 仍然禁止 Agent 直接落地正式基因事实
系统 SHALL 保持 Agent 只负责生成建议，不负责沉淀事实。即使输出结构完整，Agent 结果也 MUST 先经过后端校验与确认。

#### Scenario: Agent 输出成功
- **WHEN** Agent 返回可用建议
- **THEN** 系统 MUST 先交给后端业务层确认
- **AND** 系统 MUST NOT 让 Agent 直接写入基因库事实

#### Scenario: Agent 输出不可用
- **WHEN** Agent 返回不可解析或不完整结果
- **THEN** 系统 MUST 将本次任务标记为失败

