## ADDED Requirements

### Requirement: 枝化生长 Skill 封装媒体挂载建议
枝化生长 Skill SHALL 在封装生成器结果时识别本次生成相关的媒体候选产物，并为果实候选提供媒体挂载建议。

#### Scenario: 媒体产物属于生成结果
- **WHEN** 生成器 Skill 产出的媒体是本次果实内容的一部分
- **THEN** 枝化生长 Skill MUST 将其标记为建议挂载到果实
- **AND** 系统 MUST 在媒体接管成功后建立果实媒体挂载

#### Scenario: 媒体产物只是中间素材
- **WHEN** 生成器 Skill 产出的媒体只是中间参考或临时素材
- **THEN** 枝化生长 Skill MAY 不建议挂载到果实
- **AND** 系统 MUST 不把未挂载中间素材展示为果实正式媒体
