## ADDED Requirements

### Requirement: 工作区集成枝化生长管线体验
前端 SHALL 将枝化生长管线信息集成到工作区体验中。管线信息 MUST 服务于用户理解本轮探索和生成进度，MUST 不改变内容树拖拽、节点选择、任务轮询和物竞天择规则。

#### Scenario: 管线控件不破坏输入框
- **WHEN** 用户打开枝化生成详情
- **THEN** 前端 MUST 展示搜索模式和突变激进程度控件
- **AND** 输入正文、生成器选择、果实数量和资源引用 MUST 保持可用

#### Scenario: 生成中节点可打开进度视图
- **WHEN** 工作区存在生成中节点
- **THEN** 前端 MUST 允许用户点击查看该节点的生成路径图
- **AND** 生长中动效 MUST 不遮挡节点标题和状态标签

#### Scenario: 进度视图展示用户任务
- **WHEN** 用户查看生成路径图
- **THEN** 前端 MUST 以“当前正在执行的实际工作”为核心展示进度
- **AND** 前端 MUST NOT 展示 Agent 内部 task、skill、tool 或 LLM 调用日志

#### Scenario: 管线信息不替代业务状态
- **WHEN** 果实展示方向标签或路径摘要
- **THEN** 前端 MUST 继续以物竞天择状态作为果实主状态
- **AND** 前端 MUST NOT 使用路径图状态推导果实选择、淘汰或恢复状态
