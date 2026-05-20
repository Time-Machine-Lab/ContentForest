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

#### Scenario: 兼容 payload attachments
- **WHEN** 生成器原始输出或候选 payload 中包含 attachments 字符串列表
- **THEN** 枝化生长 Skill MAY 将其作为生成器输出提示或 warning 来源
- **AND** 系统 MUST 不把该字符串列表直接当作正式媒体挂载关系

#### Scenario: 生成媒体不污染 usedResourceRefs
- **WHEN** 枝化生长 Skill 封装生成器产生的新图片或视频
- **THEN** Skill MUST 不把该新媒体写入 usedResourceRefs
- **AND** usedResourceRefs MUST 只表达本轮授权输入资源的使用情况
