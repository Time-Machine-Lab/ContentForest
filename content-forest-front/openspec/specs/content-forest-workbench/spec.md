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
