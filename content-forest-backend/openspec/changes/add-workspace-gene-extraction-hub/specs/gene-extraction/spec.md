## ADDED Requirements

### Requirement: 汲取提醒来源边界

系统 MUST 明确第一期汲取提醒的自动创建边界。系统 MUST 允许果实选择和果实淘汰创建轻量汲取提醒，并且 MUST NOT 因发布操作自动创建汲取提醒。

#### Scenario: 果实选择创建汲取提醒
- **WHEN** 一个果实被标记为已选择
- **THEN** 系统 MUST 能为该果实所属种子创建待处理汲取提醒
- **AND** 该提醒 MUST 以果实选择作为弱证据来源

#### Scenario: 果实淘汰创建汲取提醒
- **WHEN** 一个果实被标记为已淘汰
- **THEN** 系统 MUST 能为该果实所属种子创建待处理汲取提醒
- **AND** 该提醒 MUST 以果实淘汰作为弱证据来源

#### Scenario: 发布操作不创建汲取提醒
- **WHEN** 用户为已选择果实创建或更新发布记录
- **THEN** 系统 MUST NOT 自动创建基因汲取提醒
- **AND** 系统 MUST NOT 自动发起基因汲取任务

#### Scenario: 发布记录作为显式证据来源
- **WHEN** 用户在基因汲取操作中显式选择发布记录作为证据来源
- **THEN** 系统 MUST 允许该发布记录作为基因汲取任务的证据来源
- **AND** 系统 MUST NOT 将该行为视为发布操作自动触发汲取

### Requirement: 工作区发起汲取复用既有任务能力

系统 MUST 支持工作区统一基因汲取组件通过既有 Gene Controller 发起基因汲取任务，不得为工作区新增独立的汲取执行入口。

#### Scenario: 从工作区提醒发起汲取
- **WHEN** 用户在工作区统一基因汲取组件中基于待处理提醒发起汲取
- **THEN** 系统 MUST 使用 `docs/api/gene.yaml` 中的人为触发基因汲取任务接口创建任务
- **AND** 系统 MUST 复用现有 AgentPort 基因汲取能力生成待确认建议

#### Scenario: 工作区忽略提醒
- **WHEN** 用户在工作区统一基因汲取组件中忽略待处理提醒
- **THEN** 系统 MUST 使用 `docs/api/gene.yaml` 中的提醒忽略接口处理提醒
- **AND** 被忽略提醒 MUST NOT 再出现在工作区基因汲取中心的待处理提醒中
