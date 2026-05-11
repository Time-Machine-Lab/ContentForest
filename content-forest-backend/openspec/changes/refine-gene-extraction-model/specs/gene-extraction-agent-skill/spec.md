## ADDED Requirements

### Requirement: 内置基因汲取 Skill 必须消费用户原因
系统 SHALL 要求内置基因汲取 Skill 在生成候选建议时消费用户原因与授权证据上下文。Skill MUST 将该原因纳入解释与判断，不得忽略已提供的原因说明。

#### Scenario: Skill 读取用户原因
- **WHEN** Agent 执行基因汲取任务
- **THEN** Skill MUST 读取任务中的用户原因说明
- **AND** Skill MUST 将其作为生成建议的上下文之一

#### Scenario: 原因缺失时仍可运行
- **WHEN** 任务未提供用户原因
- **THEN** Skill MUST 仍然能够运行
- **AND** Skill MUST 将原因缺失视为可空上下文

### Requirement: Skill 必须区分正向与负向基因
系统 SHALL 要求基因汲取 Skill 在推理过程中区分正向基因与负向基因。Skill MUST 产出可供后续复用的正向候选，也 MUST 产出需要规避的负向候选。

#### Scenario: 识别正向基因
- **WHEN** Skill 从证据中识别出值得延续的特征
- **THEN** Skill MUST 输出正向基因候选

#### Scenario: 识别负向基因
- **WHEN** Skill 从证据中识别出需要规避的特征
- **THEN** Skill MUST 输出负向基因候选

### Requirement: 候选建议必须面向下一轮生长使用
系统 SHALL 要求 Skill 的输出不是抽象总结，而是能够被后续枝化生长复用的操作性建议。每条建议 MUST 说明下一轮应如何继承、变异、组合或规避。

#### Scenario: 生成可复用建议
- **WHEN** Skill 生成基因汲取结果
- **THEN** 每条建议 MUST 说明下一轮的使用方式
- **AND** 建议 MUST 能被后续枝化生长策略直接消费

#### Scenario: 避免空泛结论
- **WHEN** 模型输出缺少具体使用方式
- **THEN** 系统 MUST 将其视为结构化不足

