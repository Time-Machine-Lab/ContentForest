# gene-extraction-reasoned-input Specification

## Purpose
TBD - created by archiving change refine-gene-extraction-model. Update Purpose after archive.
## Requirements
### Requirement: 基因汲取支持用户原因输入
系统 SHALL 允许用户在发起基因汲取时填写本次事件的原因说明，并将该原因作为本次汲取上下文的一部分传递到后端与 Agent。

#### Scenario: 用户填写原因后进入汲取流程
- **WHEN** 用户在发起基因汲取时输入原因说明
- **THEN** 系统 MUST 将该原因与本次汲取事件关联
- **AND** 系统 MUST 将该原因一并传递给后端汲取流程

#### Scenario: 用户未填写原因仍可继续
- **WHEN** 用户发起基因汲取但未填写原因说明
- **THEN** 系统 MUST 仍然允许本次汲取继续
- **AND** 系统 MUST 将该原因视为可空上下文而不是错误

### Requirement: 用户原因仅作为证据上下文
系统 SHALL 将用户原因视为证据上下文，而不是自动成立的基因结论。原因内容 MUST 参与后续候选建议生成与解释，但 MUST NOT 直接替代正式基因沉淀结果。

#### Scenario: 原因参与解释但不直接沉淀
- **WHEN** 系统基于用户原因生成基因候选建议
- **THEN** 系统 MUST 将原因纳入解释上下文
- **AND** 系统 MUST NOT 因为存在原因输入就自动生成正式基因沉淀

#### Scenario: 原因可被编辑但可追溯
- **WHEN** 用户在确认前调整本次原因说明
- **THEN** 系统 MUST 保留最新原因作为当前汲取上下文
- **AND** 系统 MUST 允许后续追溯该原因的变更痕迹

