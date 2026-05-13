## ADDED Requirements

### Requirement: 展示营养汲取建议
前端 SHALL 在营养工作台右侧展示当前种子的待处理营养汲取建议。建议卡片 MUST 提供采纳和忽略操作。

#### Scenario: 展示建议列表
- **WHEN** 营养工作台加载当前种子
- **THEN** 前端 MUST 请求并展示待处理营养汲取建议
- **AND** 每条建议 MUST 显示标题、来源和简短说明

#### Scenario: 忽略建议
- **WHEN** 用户点击忽略建议
- **THEN** 前端 MUST 调用后端忽略接口
- **AND** 成功后该建议 MUST 从右侧列表移除

### Requirement: 采纳建议并填充研究输入
前端 SHALL 支持用户采纳营养汲取建议。采纳后 MUST 创建未沉淀营养卡片，并将建议内容填入中间 Agent 输入框。

#### Scenario: 采纳建议
- **WHEN** 用户点击采纳建议
- **THEN** 前端 MUST 调用后端采纳接口
- **AND** 左侧 MUST 出现新建的未沉淀营养卡片
- **AND** 中间 Agent 输入框 MUST 填入建议内容

### Requirement: 展示新鲜度提醒和使用效果摘要
前端 SHALL 在营养卡片详情或卡片辅助信息中展示新鲜度提醒和使用效果摘要。

#### Scenario: 展示新鲜度提醒
- **WHEN** 后端返回营养卡片需要重新研究的提醒
- **THEN** 前端 MUST 在卡片上展示新鲜度提示

#### Scenario: 展示使用效果摘要
- **WHEN** 用户查看营养卡片详情
- **THEN** 前端 MUST 展示该营养被引用次数、关联果实和后续选择/淘汰/发布反馈摘要
- **AND** 前端 MUST NOT 将摘要展示为绝对质量评分

### Requirement: 展示相似合并提示
前端 SHALL 在可沉淀营养块或新卡片出现相似营养时展示合并提示。用户 MUST 可以选择合并或保留为新卡片。

#### Scenario: 出现相似营养提示
- **WHEN** 后端返回相似营养摘要
- **THEN** 前端 MUST 展示可能相似的营养卡片
- **AND** 前端 MUST 提供合并和保留为新卡片操作
