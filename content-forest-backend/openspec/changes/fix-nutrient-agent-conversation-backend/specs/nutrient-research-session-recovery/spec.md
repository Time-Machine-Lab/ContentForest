## ADDED Requirements

### Requirement: 按种子恢复营养研究会话
系统 SHALL 提供按种子查询营养研究会话的能力，用于营养工作台刷新后恢复新建会话和历史会话。该接口 MUST 归属于 `docs/api/nutrient.yaml` 的 nutrient Controller 契约。

#### Scenario: 查询种子级研究会话
- **WHEN** 前端按种子查询营养研究会话列表
- **THEN** 系统 MUST 返回归属于该种子的研究会话摘要
- **AND** 返回结果 MUST 包含种子级会话和绑定营养内容的会话
- **AND** 返回结果 MUST 按最近更新时间倒序排列

#### Scenario: 按营养内容过滤会话
- **WHEN** 前端按种子和营养内容过滤研究会话
- **THEN** 系统 MUST 只返回绑定该营养内容的研究会话
- **AND** 系统 MUST 不返回其他营养内容或其他种子的会话

### Requirement: 新会话必须可恢复
系统 SHALL 将用户创建的种子级营养研究会话保存为系统事实，刷新页面后仍可通过种子级会话列表恢复。

#### Scenario: 创建种子级新会话后刷新
- **WHEN** 用户创建未绑定营养内容的研究会话
- **THEN** 系统 MUST 保存该会话与种子的归属关系
- **AND** 后续按种子查询会话列表时 MUST 返回该会话
