# content-forest-workbench Specification

## Purpose

定义内容森林前端工作台外壳、种子库入口、种子工作区内容树画布、节点详情、物竞天择操作、枝化生长交互和后端工作区 API 对接规则。
## Requirements
### Requirement: 主工作台外壳
前端 SHALL 提供内容森林主工作台外壳，用于承载种子库、生成器、营养库和后续工作区页面。该外壳 MUST 遵循 `docs/spec/DESIGN.md` 定义的暗色、紧凑、命令式工作台风格。

#### Scenario: 打开主工作台
- **WHEN** 用户进入内容森林前端应用
- **THEN** 前端 MUST 展示主工作台外壳
- **AND** 前端 MUST 将种子库作为第一期默认可用入口

#### Scenario: 保持工作台视觉一致
- **WHEN** 前端展示主工作台外壳内的页面
- **THEN** 页面 MUST 使用统一的暗色工作台背景、紧凑导航、顶部命令区域和内容承载布局
- **AND** 页面 MUST 不使用营销站 Hero 或传统后台大表格作为主视觉

### Requirement: 全局导航边界
前端 SHALL 在左侧全局导航中展示主工作台级入口。已归档种子 MUST NOT 作为左侧全局导航项出现，归档筛选 MUST 归属于种子库页面内部。

#### Scenario: 查看左侧导航
- **WHEN** 用户查看左侧全局导航
- **THEN** 前端 MUST 展示种子库、生成器、营养库等主工作台级入口
- **AND** 前端 MUST NOT 在左侧全局导航中展示已归档种子入口

#### Scenario: 进入种子库归档视图
- **WHEN** 用户需要查看已归档种子
- **THEN** 前端 MUST 在种子库页面内部提供已归档视图入口

### Requirement: 页面级命令入口
前端 SHALL 在主工作台顶部提供页面级命令入口，用于承载当前页面的主要操作和后续命令面板能力。本次种子库页面中，该入口 MUST 能触发新建种子的 Command Modal。

#### Scenario: 在种子库触发命令入口
- **WHEN** 用户在种子库页面点击顶部命令入口
- **THEN** 前端 MUST 打开新建种子的 Command Modal

#### Scenario: 页面主要操作可见
- **WHEN** 用户进入种子库页面
- **THEN** 前端 MUST 在顶部区域提供新建种子的主要操作入口

### Requirement: 种子工作区入口与快照加载
前端 SHALL 在种子工作区路由中提供可交互内容树页面，并在进入页面时调用 `docs/api/workspace.yaml` 定义的 `GET /api/seeds/{seedId}/workspace` 读取工作区快照。工作区页面 MUST 以快照中的种子、节点、边和资源作为主数据源。

#### Scenario: 从种子库进入工作区
- **WHEN** 用户在种子库中打开某个种子的工作区入口
- **THEN** 前端 MUST 进入该种子的工作区路由
- **AND** 前端 MUST 请求 `GET /api/seeds/{seedId}/workspace`
- **AND** 前端 MUST 保留返回种子库的导航能力

#### Scenario: 加载工作区快照成功
- **WHEN** 工作区快照加载成功
- **THEN** 前端 MUST 根据返回的 `nodes` 与 `edges` 构建内容树
- **AND** 前端 MUST 根据返回的 `resources` 初始化生成器、营养库引用和基因引用选项

#### Scenario: 工作区快照加载失败
- **WHEN** `GET /api/seeds/{seedId}/workspace` 返回错误
- **THEN** 前端 MUST 展示可感知的失败状态
- **AND** 前端 MUST 提供重新加载工作区快照的操作入口

### Requirement: 内容树画布与运行时树布局
前端 SHALL 提供全屏内容树画布，支持画布拖拽浏览、节点拖拽和基于父子关系的动态连接线。前端 MUST 在后端不提供节点坐标的情况下，根据工作区快照的节点和边生成运行时树布局；节点拖拽位置 MUST 只作为前端运行时状态，不持久化到后端。

#### Scenario: 根据快照构建树布局
- **WHEN** 工作区快照返回节点和边
- **THEN** 前端 MUST 以种子节点作为内容树根节点
- **AND** 前端 MUST 根据父子边关系分层展示果实节点
- **AND** 前端 MUST 使用真实边关系绘制连接线

#### Scenario: 展示真实父子连接线
- **WHEN** 工作区展示内容树
- **THEN** 前端 MUST 根据父子关系绘制种子与果实、果实与果实之间的连接线
- **AND** 每条连接线 MUST 连接到对应父节点和子节点附近

#### Scenario: 拖拽节点
- **WHEN** 用户拖拽工作区中的种子或果实节点
- **THEN** 前端 MUST 更新当前页面中的节点位置
- **AND** 前端 MUST 同步更新连接线位置
- **AND** 前端 MUST NOT 调用任何节点位置持久化接口
- **AND** 拖拽结束 MUST NOT 误触发节点详情切换

#### Scenario: 拖拽画布浏览内容树
- **WHEN** 用户在画布空白区域拖拽
- **THEN** 前端 MUST 平移内容树视图
- **AND** 节点和连接线 MUST 作为同一内容树整体移动

### Requirement: 种子与果实节点视觉状态
前端 SHALL 在内容树中清晰区分种子节点和果实节点，并展示果实物竞天择状态。果实状态 MUST 使用 `candidate`、`selected`、`eliminated` 的领域语义映射，MUST 保持已淘汰果实可见但弱化展示。

#### Scenario: 区分种子和果实节点
- **WHEN** 工作区展示内容树节点
- **THEN** 前端 MUST 使用不同视觉样式区分种子节点和果实节点
- **AND** 种子节点 MUST 表达根节点语义
- **AND** 果实节点 MUST 表达内容产物语义

#### Scenario: 展示果实选择状态
- **WHEN** 果实处于候选、已选择或已淘汰状态
- **THEN** 前端 MUST 在节点上展示对应状态
- **AND** 已选择果实 MUST 比候选果实更突出
- **AND** 已淘汰果实 MUST 保持可见但视觉弱化

### Requirement: 节点详情读取与展示
前端 SHALL 在用户点击工作区节点时展示右侧详情面板，并按节点类型读取对应 Markdown 详情。种子详情 MUST 使用 `docs/api/seed.yaml` 定义的 `GET /api/seeds/{seedId}`，果实详情 MUST 使用 `docs/api/fruit.yaml` 定义的 `GET /api/fruits/{fruitId}`。

#### Scenario: 点击种子节点
- **WHEN** 用户点击工作区中的种子节点
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}` 获取种子 Markdown
- **AND** 前端 MUST 在右侧详情面板展示种子标题和 Markdown 正文
- **AND** 前端 MUST NOT 展示果实物竞天择操作
- **AND** 前端 MUST 隐藏底部枝化生长输入框

#### Scenario: 点击果实节点
- **WHEN** 用户点击工作区中的果实节点
- **THEN** 前端 MUST 调用 `GET /api/fruits/{fruitId}` 获取果实 Markdown
- **AND** 前端 MUST 在右侧详情面板展示果实摘要、基因标签、物竞天择状态和 Markdown 正文
- **AND** 前端 MUST 根据果实物竞天择状态展示对应操作或说明

### Requirement: 果实物竞天择对接
前端 SHALL 使用 `docs/api/fruit.yaml` 中定义的果实状态接口完成选择、淘汰和恢复候选操作，并在操作成功后同步工作区节点状态。

#### Scenario: 选择候选果实
- **WHEN** 用户在候选果实详情卡片中执行选择操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/select`
- **AND** 前端 MUST 将该果实状态同步为已选择

#### Scenario: 淘汰候选果实
- **WHEN** 用户在候选果实详情卡片中执行淘汰操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/eliminate`
- **AND** 前端 MUST 将该果实状态同步为已淘汰

#### Scenario: 恢复已淘汰果实
- **WHEN** 用户在已淘汰果实详情卡片中执行恢复操作
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/restore-candidate`
- **AND** 前端 MUST 将该果实状态同步为候选

#### Scenario: 已选择果实不展示操作按钮
- **WHEN** 用户选中已选择果实
- **THEN** 前端 MUST NOT 展示“选择”、“淘汰”或“恢复”操作按钮
- **AND** 前端 MUST 展示该果实已进入发布验证与数据回流语义的状态说明

### Requirement: 枝化生长输入框显示规则
前端 SHALL 在工作区底部提供 Codex 风格枝化生长输入框，但该输入框 MUST 只在已选择果实被选中且工作区非只读时显示。生成器、果实数量和引用资源 MUST 来自工作区快照资源或失败输入恢复结果。

#### Scenario: 已选择果实显示输入框
- **WHEN** 用户选中已选择果实且工作区非只读
- **THEN** 前端 MUST 展示底部枝化生长输入框
- **AND** 输入框 MUST 展示当前生长源
- **AND** 输入框 MUST 展示可用于本次工作区的生成器、果实数量和资源引用信息

#### Scenario: 非已选择节点隐藏输入框
- **WHEN** 用户选中种子节点、候选果实或已淘汰果实
- **THEN** 前端 MUST 隐藏底部枝化生长输入框
- **AND** 前端 MUST 保留右侧详情面板展示

### Requirement: 引用资源与枝化详情面板
前端 SHALL 在枝化生长输入框中提供 `@` 引用资源交互，并在枝化详情小面板中展示已引用的营养库和基因库资源。引用内容 MUST 使用特殊样式区别于普通输入文本。

#### Scenario: 输入框展示引用样式
- **WHEN** 枝化生长输入框中存在 `@` 引用内容
- **THEN** 前端 MUST 使用特殊视觉样式高亮引用内容
- **AND** 前端 MUST 将引用资源以 chip 形式展示在输入框下方

#### Scenario: 查看枝化详情
- **WHEN** 用户点击“枝化生长详情”
- **THEN** 前端 MUST 在输入框附近展示小型详情面板
- **AND** 详情面板 MUST 展示生成器、果实数量和引用资源
- **AND** 详情面板 MUST 展示已引用的营养库和基因库资源

### Requirement: 枝化生长任务对接
前端 SHALL 使用 `docs/api/growth.yaml` 定义的生长任务接口发起枝化生长、展示生长中状态、轮询任务结果，并在任务完成或失败后刷新工作区快照。

#### Scenario: 发起枝化生长
- **WHEN** 用户在允许生长的节点上提交悬浮输入框
- **THEN** 前端 MUST 调用 `POST /api/growth-tasks`
- **AND** 请求体 MUST 包含 `seedId`、`sourceNodeRef`、`generatorId`
- **AND** 前端 MUST 将输入内容、果实数量、营养库引用、基因引用和详情参数映射到接口契约允许的字段

#### Scenario: 轮询生长任务
- **WHEN** `POST /api/growth-tasks` 创建任务成功
- **THEN** 前端 MUST 将来源节点展示为生长中
- **AND** 前端 MUST 轮询 `GET /api/growth-tasks/{taskId}`
- **AND** 前端 MUST 在任务 `completed` 或 `failed` 后停止轮询
- **AND** 前端 MUST 重新请求 `GET /api/seeds/{seedId}/workspace` 同步最新内容树

#### Scenario: 最近失败输入恢复
- **WHEN** 节点快照中的 `failedInput.hasFailedInput` 为真
- **THEN** 前端 MUST 在节点或输入框附近展示失败提示
- **AND** 前端在用户恢复失败输入时 MUST 调用 `GET /api/growth-sources/{nodeType}/{nodeId}/failed-input`
- **AND** 前端 MUST 将返回的用户输入、生成器、果实数量和引用资源恢复到悬浮输入框

#### Scenario: 重试最近失败任务
- **WHEN** 用户对存在最近失败输入的节点执行重试
- **THEN** 前端 MUST 调用 `POST /api/growth-sources/{nodeType}/{nodeId}/retry`
- **AND** 前端 MUST 按新任务结果进入生长中和轮询流程

### Requirement: 工作区只读约束
前端 SHALL 尊重工作区快照中的 `workspaceReadOnly`，在只读工作区中允许浏览节点和详情，但禁止发起枝化生长和物竞天择写操作。

#### Scenario: 查看只读工作区
- **WHEN** 工作区快照返回 `workspaceReadOnly` 为真
- **THEN** 前端 MUST 允许用户拖拽浏览内容树和查看节点详情
- **AND** 前端 MUST 禁用枝化生长输入提交
- **AND** 前端 MUST 禁用选择、淘汰和恢复候选操作

### Requirement: 工作区淘汰节点视图过滤
前端 SHALL 在种子工作区提供隐藏和展示已淘汰果实节点的视图切换能力。该能力 MUST 只影响当前前端工作区视图，不改变果实物竞天择状态，不调用新增接口，不持久化节点坐标或隐藏偏好。

#### Scenario: Header 展示隐藏淘汰节点入口
- **WHEN** 用户进入种子工作区并查看工作区 header
- **THEN** 前端 MUST 在 header 操作区展示“隐藏淘汰节点”按钮
- **AND** 该按钮 MUST 与“整理树形”和“返回种子库”等工作区操作保持同一视觉体系

#### Scenario: 隐藏已淘汰果实节点
- **WHEN** 用户点击“隐藏淘汰节点”
- **THEN** 前端 MUST 从内容树画布中隐藏 `selectionState` 为 `eliminated` 的果实节点
- **AND** 前端 MUST 隐藏与这些已淘汰果实节点相关的连接线
- **AND** 前端 MUST 将按钮文案切换为“显示淘汰节点”
- **AND** 前端 MUST NOT 调用任何果实状态修改接口

#### Scenario: 显示已淘汰果实节点
- **WHEN** 用户在已隐藏淘汰节点状态下点击“显示淘汰节点”
- **THEN** 前端 MUST 恢复展示 `selectionState` 为 `eliminated` 的果实节点
- **AND** 已淘汰果实节点 MUST 保持已淘汰状态的弱化视觉样式
- **AND** 前端 MUST 恢复展示这些节点与可见父子节点之间的连接线
- **AND** 前端 MUST 将按钮文案切换为“隐藏淘汰节点”

#### Scenario: 隐藏或展示后动态整理树形
- **WHEN** 用户隐藏或展示淘汰节点
- **THEN** 前端 MUST 基于当前可见节点集合重新计算运行时树布局
- **AND** 前端 MUST 将内容树动态整理为自底向上的清晰树形结构
- **AND** 前端 MUST 同步更新连接线位置
- **AND** 前端 MUST 调整画布视图使整理后的可见内容树尽量居中可见
- **AND** 前端 MUST NOT 将整理后的节点坐标持久化到后端

#### Scenario: 当前选中淘汰节点被隐藏
- **WHEN** 用户当前选中的节点是已淘汰果实
- **AND** 用户点击“隐藏淘汰节点”
- **THEN** 前端 MUST 自动切换到仍可见的节点
- **AND** 前端 SHOULD 优先选择当前种子的根节点
- **AND** 右侧详情面板 MUST 展示切换后的可见节点详情

#### Scenario: 生长中占位节点与淘汰节点过滤共存
- **WHEN** 工作区存在生长中占位节点
- **AND** 用户隐藏或展示淘汰节点
- **THEN** 前端 MUST 保持生长中占位节点可见
- **AND** 生长中占位节点 MUST 继续参与运行时树布局
- **AND** 生长中占位节点与来源节点之间的临时连接线 MUST 正常展示

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

### Requirement: 工作区统一基因汲取建议组件

前端 MUST 在种子工作区提供统一的基因汲取建议组件。该组件 MUST 只消费 `docs/api/workspace.yaml` 中 `GET /api/seeds/{seedId}/workspace` 返回的基因汲取中心数据，并且 MUST 聚焦当前需要处理的汲取信号和待沉淀建议。

#### Scenario: 展示待处理基因汲取建议

- **WHEN** 工作区快照返回基因汲取中心数据
- **THEN** 前端 MUST 在工作区统一组件中展示待处理汲取提醒和待确认基因建议
- **AND** 前端 MUST 提供汲取、忽略、查看和沉淀建议所需操作
- **AND** 前端 MUST NOT 在果实详情或发布记录区域重复展示分散的基因汲取入口

#### Scenario: 展示基因汲取空态

- **WHEN** 工作区快照中的基因汲取中心没有待处理提醒且没有待确认建议
- **THEN** 前端 MUST 在统一组件中展示可感知的空态
- **AND** 前端 MUST NOT 根据果实状态自行生成汲取提示

#### Scenario: 进入当前种子基因库

- **WHEN** 用户在统一组件中点击基因库入口
- **THEN** 前端 MUST 进入当前种子上下文的基因库页面
- **AND** 前端 MUST NOT 跳转到全局基因库页签

### Requirement: 种子级基因库页面

前端 MUST 提供种子级基因库页面，用于浏览当前种子已确认沉淀的基因经验。该页面 MUST 通过种子详情或工作区中的当前种子入口进入，不得作为左侧全局导航入口。

#### Scenario: 从种子详情进入基因库

- **WHEN** 用户在种子详情操作区点击基因库入口
- **THEN** 前端 MUST 进入该种子的基因库页面
- **AND** 前端 MUST 保留打开该种子工作区和返回种子库的入口

#### Scenario: 浏览基因库经验

- **WHEN** 用户进入种子级基因库页面
- **THEN** 前端 MUST 展示基因库概览、谱系分布、基因经验列表和经验详情
- **AND** 前端 MUST 使用 `docs/api/gene.yaml` 中的基因库和基因经验接口读取数据

#### Scenario: 基因库不作为全局页签

- **WHEN** 用户查看左侧全局导航
- **THEN** 前端 MUST NOT 展示全局基因库入口
- **AND** 基因库入口 MUST 归属于具体种子上下文

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
