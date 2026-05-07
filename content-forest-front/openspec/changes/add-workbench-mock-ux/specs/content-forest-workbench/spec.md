## ADDED Requirements

### Requirement: 种子工作区 mock 内容树页面
前端 SHALL 在种子工作区路由中提供可交互的 mock 内容树页面，用于演示第一期工作区 UI/UX。该页面 MUST 从种子库入口进入，MUST 使用本地 mock 数据构建种子、果实和父子关系，MUST NOT 调用后端接口创建或更新真实数据。

#### Scenario: 从种子库进入工作区
- **WHEN** 用户在种子库中打开某个种子的工作区入口
- **THEN** 前端 MUST 进入该种子的工作区路由
- **AND** 前端 MUST 展示基于 mock 数据构建的内容树画布
- **AND** 前端 MUST 保留返回种子库的导航能力

#### Scenario: 加载工作区 mock 数据
- **WHEN** 工作区页面初始化
- **THEN** 前端 MUST 使用本地 mock 数据展示一个种子根节点和多个果实节点
- **AND** mock 种子语义 MUST 参考 `docs/api/seed.yaml` 中的 `SeedRootNode`
- **AND** mock 果实语义 MUST 参考 `docs/api/fruit.yaml` 中的 `FruitSummary`、`FruitDetail` 和 `ParentNodeRef`

### Requirement: 内容树画布与动态树边
前端 SHALL 提供全屏内容树画布，支持画布拖拽浏览、节点拖拽和基于父子关系的动态连接线。连接线 MUST 表达真实 mock 父子关系，MUST NOT 作为静态背景图或固定装饰线存在。

#### Scenario: 展示真实父子连接线
- **WHEN** 工作区展示 mock 内容树
- **THEN** 前端 MUST 根据 mock 父子关系绘制种子与果实、果实与果实之间的连接线
- **AND** 每条连接线 MUST 连接到对应父节点和子节点附近

#### Scenario: 拖拽节点后更新连接线
- **WHEN** 用户拖拽内容树中的任一节点
- **THEN** 前端 MUST 移动该节点
- **AND** 前端 MUST 实时更新与该节点相关的连接线
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

### Requirement: 节点详情面板
前端 SHALL 在用户点击种子或果实节点后展示右侧详情面板。详情面板 MUST 展示当前节点标题、Markdown 内容、基因标签和发布反馈 mock 信息，并按节点类型和状态展示合适操作。

#### Scenario: 查看种子详情
- **WHEN** 用户点击种子节点
- **THEN** 前端 MUST 在右侧详情面板展示种子标题和 Markdown 内容
- **AND** 前端 MUST NOT 展示果实物竞天择操作
- **AND** 前端 MUST 隐藏底部枝化生长输入框

#### Scenario: 查看果实详情
- **WHEN** 用户点击任一果实节点
- **THEN** 前端 MUST 在右侧详情面板展示果实标题、Markdown 内容、基因标签和发布反馈 mock 信息
- **AND** 前端 MUST 根据果实物竞天择状态展示对应操作或说明

### Requirement: 物竞天择 mock 状态操作
前端 SHALL 支持在工作区详情面板中用 mock 状态完成果实选择、淘汰和恢复。该操作 MUST 只更新前端本地状态，MUST NOT 调用 `docs/api/fruit.yaml` 中的真实状态更新接口。

#### Scenario: 候选果实展示选择和淘汰
- **WHEN** 用户选中候选果实
- **THEN** 前端 MUST 在详情面板展示“选择”和“淘汰”操作
- **AND** 用户点击任一操作后，前端 MUST 更新该果实的本地 mock 状态和节点视觉

#### Scenario: 已选择果实不展示操作按钮
- **WHEN** 用户选中已选择果实
- **THEN** 前端 MUST NOT 展示“选择”、“淘汰”或“恢复”操作按钮
- **AND** 前端 MUST 展示该果实已进入发布验证与数据回流语义的状态说明

#### Scenario: 已淘汰果实只展示恢复
- **WHEN** 用户选中已淘汰果实
- **THEN** 前端 MUST 只展示“恢复”操作
- **AND** 用户点击恢复后，前端 MUST 将该果实本地 mock 状态恢复为候选

### Requirement: 枝化生长输入框显示规则
前端 SHALL 在工作区底部提供 Codex 风格枝化生长输入框，但该输入框 MUST 只在已选择果实被选中时显示。生成器、果实数量和突变率在本次实现中 MUST 是只读 mock 信息。

#### Scenario: 已选择果实显示输入框
- **WHEN** 用户选中已选择果实
- **THEN** 前端 MUST 展示底部枝化生长输入框
- **AND** 输入框 MUST 展示当前生长源
- **AND** 输入框 MUST 展示只读生成器、只读果实数量和只读突变率

#### Scenario: 非已选择节点隐藏输入框
- **WHEN** 用户选中种子节点、候选果实或已淘汰果实
- **THEN** 前端 MUST 隐藏底部枝化生长输入框
- **AND** 前端 MUST 保留右侧详情面板展示

### Requirement: 引用资源与枝化详情面板
前端 SHALL 在枝化生长输入框中提供 `@` 引用资源的 mock 交互，并在枝化详情小面板中展示已引用的营养库和基因库资源。引用内容 MUST 使用特殊样式区别于普通输入文本。

#### Scenario: 输入框展示引用样式
- **WHEN** 枝化生长输入框中存在 `@` 引用内容
- **THEN** 前端 MUST 使用特殊视觉样式高亮引用内容
- **AND** 前端 MUST 将引用资源以 chip 形式展示在输入框下方

#### Scenario: 查看枝化详情
- **WHEN** 用户点击“枝化生长详情”
- **THEN** 前端 MUST 在输入框附近展示小型详情面板
- **AND** 详情面板 MUST 展示只读生成器、只读果实数量、只读突变率
- **AND** 详情面板 MUST 展示已引用的营养库和基因库 mock 资源

### Requirement: Mock 枝化生长反馈
前端 SHALL 支持用 mock 方式模拟枝化生长反馈。用户点击生长按钮后，前端 MUST 在当前已选择果实上展示生成中状态，并在完成后追加 mock 新生果实和动态树边。

#### Scenario: 发起 mock 生长
- **WHEN** 用户在已选择果实的枝化输入框中点击生长按钮
- **THEN** 前端 MUST 在当前果实节点上展示生成中反馈
- **AND** 前端 MUST NOT 调用后端生长任务或 Agent 接口

#### Scenario: Mock 生长完成
- **WHEN** mock 生长完成
- **THEN** 前端 MUST 在内容树上追加一个候选果实节点
- **AND** 前端 MUST 追加当前生长源到新果实的父子连接线
- **AND** 前端 MUST 自动选中新生成的候选果实并展示其详情
- **AND** 新生成的候选果实 MUST 因状态不是已选择而不展示枝化生长输入框
