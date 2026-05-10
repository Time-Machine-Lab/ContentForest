## ADDED Requirements

### Requirement: 工作区节点卡片局部视觉重构
前端 SHALL 在种子工作区内容树中以更高级、克制、紧凑的卡片样式展示种子节点和果实节点。该重构 MUST 保留现有节点类型、选中状态、拖拽行为、生成中状态、失败状态和果实物竞天择状态映射，不得改变 `docs/api/workspace.yaml` 中 `WorkspaceNode`、`WorkspaceNodeGrowth`、`WorkspaceFailedInputHint`、`selectionState` 的数据来源与语义。

#### Scenario: 保留节点业务状态
- **WHEN** 工作区通过 `GET /api/seeds/{seedId}/workspace` 返回种子节点、候选果实、已选择果实、已淘汰果实或生成中节点
- **THEN** 前端 MUST 继续根据返回的 `nodeType`、`selectionState`、`growth.isGrowing` 和 `failedInput` 展示对应卡片状态
- **AND** 前端 MUST NOT 为卡片视觉重构新增或修改任何后端字段
- **AND** 前端 MUST NOT 改变节点选中、拖拽、隐藏淘汰节点、生成中占位或失败恢复逻辑

#### Scenario: 提升卡片视觉层级
- **WHEN** 用户查看工作区内容树节点
- **THEN** 前端 MUST 使用暗色工作台风格的边框、层次、状态 chip 和克制阴影表达节点状态
- **AND** 种子节点 MUST 与果实节点在视觉结构或状态强调上可区分
- **AND** 已选择果实 MUST 比候选果实更突出
- **AND** 已淘汰果实 MUST 保持可见但视觉弱化

#### Scenario: 生成中卡片保持可读
- **WHEN** 节点处于 `growth.isGrowing` 或前端生成中占位状态
- **THEN** 前端 MUST 展示可感知但克制的生成中反馈
- **AND** 生成中反馈 MUST NOT 遮挡节点标题、状态 chip 或点击目标
- **AND** 在用户启用 reduced-motion 偏好时，生成中动效 MUST 降级为非连续动画或静态状态表达

### Requirement: 枝化生长输入框控件与下拉菜单重构
前端 SHALL 优化底部枝化生长输入框中的生长源、生成器、果实数量、突变率、引用资源和提交动作展示。生成器与果实数量下拉菜单 MUST 使用受控高度、可滚动、不会超出主要可视区域的浮层样式，选项数据 MUST 继续来自 `docs/api/workspace.yaml` 的 `WorkspaceResources.generators` 和前端既定果实数量选项。

#### Scenario: 生成器下拉可滚动选择
- **WHEN** 用户在枝化生长输入框中打开生成器下拉菜单
- **THEN** 前端 MUST 在输入框附近展示生成器候选菜单
- **AND** 菜单 MUST 设置最大高度并支持内部滚动
- **AND** 菜单 MUST 展示当前已选生成器状态
- **AND** 菜单选中后 MUST 更新本地 `selectedGeneratorId`
- **AND** 后续提交 `POST /api/growth-tasks` 时 MUST 使用当前已选生成器映射 `generatorId`

#### Scenario: 果实数量下拉可滚动选择
- **WHEN** 用户在枝化生长输入框中打开果实数量下拉菜单
- **THEN** 前端 MUST 在输入框附近展示果实数量候选菜单
- **AND** 菜单 MUST 不因选项数量撑高到不可选择区域
- **AND** 菜单选中后 MUST 更新本地 `fruitCount`
- **AND** 后续提交 `POST /api/growth-tasks` 时 MUST 使用当前果实数量映射 `fruitCount`

#### Scenario: 输入框布局不影响工作区其他区域
- **WHEN** 用户打开生成器下拉、果实数量下拉或枝化详情面板
- **THEN** 前端 MUST 保持顶部工具栏、内容树布局、连接线、右侧详情面板和画布拖拽缩放行为不变
- **AND** 浮层 MUST 不遮挡右侧详情面板的主要操作区

### Requirement: 引用资源候选浮层与可移除引用标签
前端 SHALL 在枝化生长输入框中提供不遮挡正文的 `@` 引用资源候选浮层，并允许用户移除已引用资源。引用资源数据 MUST 继续来自 `docs/api/workspace.yaml` 的 `WorkspaceResources.nutrients` 与 `WorkspaceResources.geneInsights`，提交枝化生长时 MUST 继续按照 `docs/api/growth.yaml` 的 `StartGrowthTaskRequest.nutrientRefs` 与 `geneRefs` 映射。

#### Scenario: 引用候选浮层不与输入内容重叠
- **WHEN** 用户在枝化生长输入框中输入 `@` 或点击引用资源入口
- **THEN** 前端 MUST 在输入框附近展示资源候选浮层
- **AND** 候选浮层 MUST 与正文 textarea、已选引用标签和底部操作按钮保持视觉分离
- **AND** 候选浮层 MUST 设置最大高度并支持内部滚动
- **AND** 候选项 MUST 区分营养库资源与基因库资源

#### Scenario: 选择引用资源
- **WHEN** 用户从引用候选浮层选择营养库或基因库资源
- **THEN** 前端 MUST 将该资源加入已引用资源列表
- **AND** 前端 MUST 避免重复加入同一 `resourceType` 与 `resourceId` 的资源
- **AND** 前端 MUST 关闭引用候选浮层并保留正文输入焦点

#### Scenario: 移除已引用资源
- **WHEN** 用户点击输入框上某个已引用资源标签的移除按钮
- **THEN** 前端 MUST 从已引用资源列表中移除该资源
- **AND** 被移除的营养库资源 MUST NOT 出现在下一次 `POST /api/growth-tasks` 请求的 `nutrientRefs` 中
- **AND** 被移除的基因库资源 MUST NOT 出现在下一次 `POST /api/growth-tasks` 请求的 `geneRefs` 中
- **AND** 移除引用资源 MUST NOT 修改正文输入内容、当前选中节点或工作区快照数据

#### Scenario: 恢复失败输入后仍可移除引用
- **WHEN** 用户通过 `GET /api/growth-sources/{nodeType}/{nodeId}/failed-input` 恢复最近失败输入
- **THEN** 前端 MUST 将返回的 `nutrientRefs` 与 `geneRefs` 恢复为已引用资源标签
- **AND** 用户 MUST 能够继续移除任意已恢复的引用资源
- **AND** 后续提交 `POST /api/growth-tasks` 时 MUST 只包含移除后仍保留的引用资源
