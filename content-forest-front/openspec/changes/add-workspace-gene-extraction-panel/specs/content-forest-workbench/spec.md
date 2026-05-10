## ADDED Requirements

### Requirement: 工作区统一基因汲取组件

前端 MUST 在种子工作区提供统一的基因汲取提示与操作组件。该组件 MUST 只消费 `docs/api/workspace.yaml` 中 `GET /api/seeds/{seedId}/workspace` 返回的基因汲取中心数据。

#### Scenario: 展示基因汲取中心摘要
- **WHEN** 工作区快照返回基因汲取中心数据
- **THEN** 前端 MUST 在工作区统一组件中展示待处理汲取提醒、待确认基因建议、当前种子基因库摘要和可引用基因经验摘要
- **AND** 前端 MUST NOT 在果实详情或发布记录区域重复展示分散的基因汲取入口

#### Scenario: 展示基因汲取空态
- **WHEN** 工作区快照中的基因汲取中心没有待处理提醒且没有待确认建议
- **THEN** 前端 MUST 在统一组件中展示可感知的空态或低优先级基因库摘要
- **AND** 前端 MUST NOT 根据果实状态自行生成汲取提示

#### Scenario: 进入当前种子基因库
- **WHEN** 用户在统一组件中点击基因库入口
- **THEN** 前端 MUST 进入当前种子上下文的基因库视图或详情入口
- **AND** 前端 MUST NOT 跳转到全局基因库页签

### Requirement: 基因汲取前端操作编排

前端 MUST 从工作区统一基因汲取组件中编排基因汲取相关操作，并使用 `docs/api/gene.yaml` 中定义的 Gene Controller 接口。

#### Scenario: 基于提醒发起基因汲取
- **WHEN** 用户在统一组件中基于待处理提醒发起基因汲取
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/gene-extraction-tasks`
- **AND** 前端 MUST 在操作完成后重新请求 `GET /api/seeds/{seedId}/workspace` 同步基因汲取中心数据

#### Scenario: 忽略待处理提醒
- **WHEN** 用户在统一组件中忽略待处理汲取提醒
- **THEN** 前端 MUST 调用 `POST /api/gene-reminders/{reminderId}/ignore`
- **AND** 前端 MUST 在操作完成后刷新工作区快照

#### Scenario: 处理待确认建议
- **WHEN** 用户在统一组件中查看、编辑、确认或放弃待确认基因建议
- **THEN** 前端 MUST 使用 `docs/api/gene.yaml` 中对应的基因建议接口
- **AND** 前端 MUST 在建议状态变更后刷新工作区快照

### Requirement: 基因汲取入口边界

前端 MUST 将基因汲取入口归一到工作区统一组件，发布操作和节点详情不得自动触发基因汲取。

#### Scenario: 果实详情不展示分散汲取入口
- **WHEN** 用户在工作区点击果实节点并打开果实详情
- **THEN** 前端 MUST 继续展示果实正文、基因标签、物竞天择状态、发布和反馈入口
- **AND** 前端 MUST NOT 在果实详情第一层新增独立的基因汲取操作按钮

#### Scenario: 发布操作不触发基因汲取
- **WHEN** 用户通过发布器创建或更新发布记录
- **THEN** 前端 MUST NOT 自动打开基因汲取组件
- **AND** 前端 MUST NOT 自动调用任何基因汲取提醒或基因汲取任务接口

#### Scenario: 物竞天择操作后由后端驱动提示
- **WHEN** 用户选择、淘汰或恢复果实状态
- **THEN** 前端 MUST 按现有果实状态接口完成操作并刷新工作区快照
- **AND** 前端 MUST 只根据刷新后快照中的基因汲取中心数据展示或更新提示

### Requirement: 枝化输入框保留基因库引用

前端 MUST 保留枝化生长输入框中的 `@基因库` 引用能力，并将其与统一基因汲取组件的职责区分开。

#### Scenario: 引用已沉淀基因经验
- **WHEN** 用户在枝化生长输入框中通过 `@` 引用基因库内容
- **THEN** 前端 MUST 使用工作区快照资源中的可引用基因经验作为候选来源
- **AND** 前端 MUST 将引用结果作为枝化生长上下文提交

#### Scenario: 汲取与引用职责分离
- **WHEN** 用户查看工作区统一基因汲取组件和枝化生长输入框
- **THEN** 前端 MUST 让统一组件负责基因汲取提示、建议处理和基因库入口
- **AND** 前端 MUST 让枝化生长输入框负责引用已确认且可引用的基因经验
