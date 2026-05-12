## ADDED Requirements

### Requirement: 枝化输入框展示搜索模式和突变激进程度
前端 SHALL 在枝化生长输入框或枝化生成详情中展示搜索模式和突变激进程度。用户 MUST 能查看系统推荐值，并 MAY 切换为其他允许值。

#### Scenario: 展示系统推荐值
- **WHEN** 用户选中可生长节点并打开枝化输入框
- **THEN** 前端 MUST 展示当前搜索模式和突变激进程度
- **AND** 前端 MUST 表达这些值可由系统推荐

#### Scenario: 用户切换突变激进程度
- **WHEN** 用户在枝化生成详情中选择保守、均衡或激进
- **THEN** 前端 MUST 更新本地枝化参数
- **AND** 后续提交生长任务时 MUST 按 `docs/api/growth.yaml` 映射该值

### Requirement: 提交管线参数
前端 SHALL 在发起枝化生长时提交搜索模式和突变激进程度。提交字段 MUST 严格来自 `docs/api/growth.yaml`。

#### Scenario: 提交用户选择的管线参数
- **WHEN** 用户提交枝化生长
- **THEN** 前端 MUST 调用 `POST /api/growth-tasks`
- **AND** 请求体 MUST 包含用户当前选择的搜索模式和突变激进程度

#### Scenario: 提交默认推荐参数
- **WHEN** 用户未主动切换搜索模式或突变激进程度
- **THEN** 前端 MUST 提交当前系统推荐或契约允许的缺省值
- **AND** 前端 MUST NOT 提交数字突变率

### Requirement: 展示用户可见生成路径图
前端 SHALL 在用户点击生成中节点时展示该节点关联生长任务的临时生成路径图。路径图 MUST 来自 `GET /api/growth-tasks/{taskId}`，且前端 MUST 将其视为用户可见进度，不得展示 Agent Trace、Tool 调用、LLM 调用或 Skill 调用等工程事件。

#### Scenario: 查看生成中路径图
- **WHEN** 用户点击生成中的果实或生长中来源节点
- **THEN** 前端 MUST 查询或使用轮询结果中的路径图
- **AND** 前端 MUST 展示人能理解的步骤名称、状态和当前执行位置

#### Scenario: 顶部展示当前任务
- **WHEN** 路径图中存在执行中的步骤
- **THEN** 前端 MUST 在路径图顶部展示当前正在执行的用户任务
- **AND** 展示文本 MUST 使用用户可理解的步骤名称

#### Scenario: 不展示工程事件
- **WHEN** 后端响应或历史兼容数据中包含 task_started、skill_called、tool_called、llm_called 等工程事件
- **THEN** 前端 MUST NOT 将这些事件作为普通路径步骤展示
- **AND** 前端 MUST NOT 用这些事件替代当前任务说明

#### Scenario: 路径图更新
- **WHEN** 轮询返回路径图步骤发生变化
- **THEN** 前端 MUST 更新路径图展示
- **AND** 前端 MUST 不重置用户当前画布位置或选中节点

#### Scenario: 任务完成后隐藏路径图
- **WHEN** 生长任务完成或失败并刷新工作区快照
- **THEN** 前端 MUST 不把路径图作为果实正式详情展示
- **AND** 前端 MUST 继续展示果实正文、方向标签和物竞天择状态

### Requirement: 展示果实探索方向
前端 SHALL 在内容树节点或果实详情中展示后端返回的果实探索方向或方向摘要。方向展示 MUST 不替代果实物竞天择状态。

#### Scenario: 果实有方向摘要
- **WHEN** 工作区快照或果实详情返回探索方向摘要
- **THEN** 前端 MUST 以克制标签或摘要形式展示该方向
- **AND** 前端 MUST 保留候选、已选择、已淘汰状态作为主状态

#### Scenario: 果实无方向摘要
- **WHEN** 历史果实或接口未返回方向摘要
- **THEN** 前端 MUST 正常展示果实
- **AND** 前端 MUST 不伪造方向标签
