## MODIFIED Requirements

### Requirement: 工作区统一基因汲取建议组件
前端 MUST 在种子工作区提供统一的基因汲取建议浮动面板。该面板 MUST 只消费 `docs/api/workspace.yaml` 中 `GET /api/seeds/{seedId}/workspace` 返回的基因汲取中心数据，并且 MUST 聚焦当前需要处理的汲取信号和待确认建议。

#### Scenario: 展示待处理基因汲取建议
- **WHEN** 工作区快照返回基因汲取中心数据
- **THEN** 前端 MUST 在工作区浮动面板中展示待处理汲取提醒和待确认基因建议
- **AND** 前端 MUST 保持入口集中在同一区域
- **AND** 前端 MUST NOT 在果实详情或发布记录区域重复展示分散的基因汲取入口

#### Scenario: 展示基因汲取空态
- **WHEN** 工作区快照中的基因汲取中心没有待处理提醒且没有待确认建议
- **THEN** 前端 MUST 在浮动面板中展示清晰的空态说明
- **AND** 前端 MUST 保留基因库入口与工作区其他基础操作

#### Scenario: 进入当前种子基因库
- **WHEN** 用户在统一组件中点击基因库入口
- **THEN** 前端 MUST 进入当前种子上下文的基因库页面
- **AND** 前端 MUST NOT 跳转到全局基因库页签

### Requirement: 基因汲取前端操作编排
前端 MUST 从工作区统一基因汲取组件中编排基因汲取相关操作，并使用 `docs/api/gene.yaml` 中定义的 Gene Controller 接口。

#### Scenario: 基于提醒发起基因汲取
- **WHEN** 用户在统一组件中基于待处理提醒发起基因汲取
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/gene-extraction-tasks`
- **AND** 前端 MUST 在操作完成后重新请求 `GET /api/seeds/{seedId}/workspace` 同步基因汲取中心数据

#### Scenario: 忽略待处理提醒
- **WHEN** 用户在统一组件中忽略待处理提醒
- **THEN** 前端 MUST 调用 `POST /api/gene-reminders/{reminderId}/ignore`
- **AND** 前端 MUST 在操作完成后刷新工作区快照

#### Scenario: 处理待确认建议
- **WHEN** 用户在统一组件中查看、编辑、确认或放弃待确认基因建议
- **THEN** 前端 MUST 使用 `docs/api/gene.yaml` 中对应的基因建议接口
- **AND** 前端 MUST 在建议状态变更后刷新工作区快照

### Requirement: 基因汲取入口边界
前端 MUST 将基因汲取入口归一到工作区统一组件，发布操作和节点详情不得自动触发基因汲取。

#### Scenario: 节点详情不新增汲取入口
- **WHEN** 用户打开果实详情
- **THEN** 前端 MUST 继续展示果实正文、基因标签、物竞天择状态、发布和反馈入口
- **AND** 前端 MUST NOT 在果实详情第一层新增独立的基因汲取操作按钮

#### Scenario: 发布操作不触发基因汲取
- **WHEN** 用户通过发布器创建或更新发布记录
- **THEN** 前端 MUST NOT 自动打开基因汲取组件
- **AND** 前端 MUST NOT 自动调用任何基因汲取提醒或基因汲取任务接口

#### Scenario: 刷新后再展示提示
- **WHEN** 发布或其他工作区操作完成后触发快照刷新
- **THEN** 前端 MUST 只根据刷新后快照中的基因汲取中心数据展示或更新提示

### Requirement: 枝化输入框保留基因库引用
前端 MUST 保留枝化生长输入框中的 `@基因库` 引用能力，并将其与统一基因汲取组件的职责区分开。

#### Scenario: 引用已沉淀基因经验
- **WHEN** 用户在枝化生长输入框中通过 `@` 引用基因库内容
- **THEN** 前端 MUST 使用工作区快照资源中的可引用基因经验作为候选来源

#### Scenario: 统一组件与输入框职责分离
- **WHEN** 用户查看工作区统一基因汲取组件和枝化生长输入框
- **THEN** 前端 MUST 让统一组件负责基因汲取提示、建议处理和基因库入口
- **AND** 前端 MUST 让枝化生长输入框负责引用已确认且可引用的基因经验
