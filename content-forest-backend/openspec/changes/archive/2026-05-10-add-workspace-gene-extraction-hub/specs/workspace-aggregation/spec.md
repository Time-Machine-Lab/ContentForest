## ADDED Requirements

### Requirement: 工作区基因汲取中心聚合

系统 MUST 在工作区快照中聚合种子级基因汲取中心数据。该能力的接口契约 MUST 落到 `docs/api/workspace.yaml` 的 `GET /api/seeds/{seedId}/workspace` 响应中，并由 Workspace Controller 返回。

#### Scenario: 读取包含基因汲取中心的工作区快照
- **WHEN** 前端请求某个种子的工作区快照
- **THEN** 系统 MUST 返回该种子的基因汲取中心数据
- **AND** 基因汲取中心数据 MUST 包含待处理汲取提醒摘要、待确认基因建议摘要、种子级基因库摘要和可引用正式基因经验摘要

#### Scenario: 没有待处理基因汲取数据
- **WHEN** 某个种子没有待处理汲取提醒且没有待确认基因建议
- **THEN** 系统 MUST 仍返回基因汲取中心数据
- **AND** 系统 MUST 使用空集合或零值表达当前没有需要处理的汲取事项

#### Scenario: 基因汲取中心不返回正文
- **WHEN** 工作区快照返回基因汲取中心数据
- **THEN** 系统 MUST NOT 在快照中返回基因建议正文或正式基因经验 Markdown 正文
- **AND** 前端查看详情时 MUST 继续使用 `docs/api/gene.yaml` 中对应的 Gene Controller 接口

### Requirement: 工作区基因汲取数据由后端驱动

系统 MUST 由后端基于基因汲取领域事实生成工作区基因汲取中心数据，前端不得依赖自行推断来决定是否展示汲取提醒。

#### Scenario: 后端返回待处理提醒
- **WHEN** 某个种子存在待处理汲取提醒
- **THEN** 系统 MUST 在工作区基因汲取中心中返回这些待处理提醒的摘要
- **AND** 前端 MUST 能仅基于该返回结果展示汲取提示

#### Scenario: 后端返回待确认建议
- **WHEN** 某个种子存在待确认基因建议
- **THEN** 系统 MUST 在工作区基因汲取中心中返回这些待确认建议的摘要
- **AND** 前端 MUST 能仅基于该返回结果展示确认、编辑或放弃入口

#### Scenario: 后端返回基因库入口摘要
- **WHEN** 某个种子的基因库可用
- **THEN** 系统 MUST 在工作区基因汲取中心中返回基因库入口所需摘要
- **AND** 摘要 MUST 指向当前种子级基因库而非全局基因库
