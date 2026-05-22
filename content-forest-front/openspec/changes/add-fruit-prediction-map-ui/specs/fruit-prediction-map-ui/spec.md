## ADDED Requirements

### Requirement: 果实详情展示预测图入口
前端 SHALL 在种子工作区果实详情中展示预测图入口。该入口 MUST 只在当前选中节点为果实时展示，MUST 不在种子详情中展示。

#### Scenario: 选中果实时展示预测图入口
- **WHEN** 用户在工作区点击任意果实节点
- **THEN** 前端 MUST 在右侧果实详情中展示预测图入口
- **AND** 入口 MUST 与果实正文、物竞天择和发布记录区域保持同一工作台视觉体系

#### Scenario: 选中种子时隐藏预测图入口
- **WHEN** 用户在工作区点击种子节点
- **THEN** 前端 MUST 不展示预测图入口
- **AND** 前端 MUST 保持种子详情既有展示规则

### Requirement: 读取果实最新预测图
前端 SHALL 使用后端 `docs/api/content-experiment-calibration.yaml` 定义的 `GET /api/fruits/{fruitId}/prediction-map` 读取当前果实最新预测图。前端 MUST 不从果实 Markdown 正文解析预测图内容。

#### Scenario: 打开预测图面板
- **WHEN** 用户打开某个果实的预测图视图
- **THEN** 前端 MUST 调用 `GET /api/fruits/{fruitId}/prediction-map`
- **AND** 前端 MUST 使用接口返回结果渲染预测图

#### Scenario: 预测图尚未生成
- **WHEN** 预测图读取接口返回未生成状态
- **THEN** 前端 MUST 展示可生成预测图的空态
- **AND** 前端 MUST 不伪造评测判断、强点、风险或预期区间

#### Scenario: 读取失败
- **WHEN** 预测图读取接口返回错误
- **THEN** 前端 MUST 展示可感知的失败状态
- **AND** 前端 MUST 提供重新加载入口

### Requirement: 生成和刷新预测图
前端 SHALL 使用后端 `docs/api/content-experiment-calibration.yaml` 定义的 `POST /api/fruits/{fruitId}/prediction-map/evaluate` 为当前果实生成或刷新预测图。该操作 MUST 不改变果实物竞天择状态。

#### Scenario: 为无预测图果实生成预测图
- **WHEN** 当前果实尚无预测图且用户点击生成入口
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/prediction-map/evaluate`
- **AND** 成功后前端 MUST 展示接口返回的预测图

#### Scenario: 刷新已有预测图
- **WHEN** 当前果实已有预测图且用户点击刷新入口
- **THEN** 前端 MUST 调用 `POST /api/fruits/{fruitId}/prediction-map/evaluate`
- **AND** 成功后前端 MUST 用最新预测图更新面板

#### Scenario: 只读工作区禁用生成刷新
- **WHEN** 工作区快照返回 `workspaceReadOnly` 为真
- **THEN** 前端 MUST 允许读取已有预测图
- **AND** 前端 MUST 禁用生成或刷新预测图操作

### Requirement: 渲染预测图核心内容
前端 SHALL 渲染预测图的核心内容，包括评测判断、预期表现区间、核心赌注、内容强点、内容风险、反事实场景、推荐观察指标、置信度、置信原因、画像版本、盲评状态和生成时间。

#### Scenario: 展示完整预测图
- **WHEN** 预测图接口返回完整数据
- **THEN** 前端 MUST 展示评测判断、预期表现区间和核心赌注
- **AND** 前端 MUST 展示强点、风险、反事实场景和推荐观察指标
- **AND** 前端 MUST 展示置信度、画像版本、盲评状态和生成时间

#### Scenario: 展示低置信度预测图
- **WHEN** 预测图置信度为低或盲评状态提示锚点不足
- **THEN** 前端 MUST 明确展示低置信度边界
- **AND** 前端 MUST 不把低置信度作为系统错误处理

### Requirement: 预测图不替代用户选择
前端 SHALL 将预测图作为辅助判断视图，不得自动选择、淘汰、发布或触发基因汲取。

#### Scenario: 预测图生成成功后不改变物竞天择状态
- **WHEN** 用户生成或刷新预测图成功
- **THEN** 前端 MUST 保持当前果实的 `selectionState` 不变
- **AND** 前端 MUST 不自动调用选择、淘汰或恢复候选接口

#### Scenario: 预测图生成成功后不触发其他领域操作
- **WHEN** 用户生成或刷新预测图成功
- **THEN** 前端 MUST 不自动创建发布记录
- **AND** 前端 MUST 不自动调用反馈或基因汲取接口

### Requirement: 遵守后端契约依赖
前端 SHALL 只使用后端 `add-content-experiment-calibration` 已落地的 API 和数据结构。若 `docs/api/content-experiment-calibration.yaml` 尚未存在或字段不满足展示需求，前端实现 MUST 标记为依赖后端更新，不得自行发明接口。

#### Scenario: 后端 API 文档不存在
- **WHEN** 前端实现时缺少 `docs/api/content-experiment-calibration.yaml`
- **THEN** 前端任务 MUST 标记依赖后端契约
- **AND** 前端 MUST 不新增私有预测图接口

#### Scenario: 后端字段缺失
- **WHEN** 后端预测图响应缺少前端必须展示的领域字段
- **THEN** 前端任务 MUST 标记依赖后端补齐契约
- **AND** 前端 MUST 不从其他接口或 Markdown 中推断该字段
