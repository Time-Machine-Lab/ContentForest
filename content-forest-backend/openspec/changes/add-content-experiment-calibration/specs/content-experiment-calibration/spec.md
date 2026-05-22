## ADDED Requirements

### Requirement: 创建默认评分画像
系统 SHALL 提供默认评分画像，用于表达当前系统如何评测果实的传播适配度。评分画像 MUST 持久化到 `docs/sql/evaluation_profiles.sql` 定义的 `evaluation_profiles` 表，并记录画像版本、作用范围、评测维度、表现区间策略和启用状态。

#### Scenario: 初始化默认评分画像
- **WHEN** 系统首次启用内容实验校准能力
- **THEN** 系统 MUST 确保存在一个可用于果实评测的默认评分画像
- **AND** 默认评分画像 MUST 包含可记录到预测图的画像版本

#### Scenario: 读取当前默认评分画像
- **WHEN** 用户请求评测果实且未指定评分画像
- **THEN** 系统 MUST 使用当前启用的默认评分画像
- **AND** 后续生成的预测图 MUST 记录该画像的身份与版本

### Requirement: 评测任意果实生成预测图
系统 SHALL 支持对任意存在的果实生成当前预测图。预测图 MUST 关联明确果实，MUST 持久化到 `docs/sql/fruit_prediction_maps.sql` 定义的 `fruit_prediction_maps` 表，并 MUST 作为系统事实保存，不得写入果实 Markdown 正文。

#### Scenario: 为候选果实生成预测图
- **WHEN** 用户请求评测一个候选果实
- **THEN** 系统 MUST 读取该果实正文和系统事实
- **AND** 系统 MUST 生成并保存一张预测图
- **AND** 预测图 MUST 成为该果实当前最新预测图

#### Scenario: 为已选择或已淘汰果实生成预测图
- **WHEN** 用户请求评测一个已选择或已淘汰果实
- **THEN** 系统 MUST 允许生成预测图
- **AND** 系统 MUST 不因为果实选择状态自动拒绝评测

#### Scenario: 果实不存在时拒绝评测
- **WHEN** 用户请求评测一个不存在的果实
- **THEN** 系统 MUST 返回资源不存在错误
- **AND** 系统 MUST 不创建预测图记录

### Requirement: 预测图包含核心评测信息
系统 SHALL 要求预测图至少包含评测判断、内容强点、内容风险、预期表现区间、核心赌注、反事实场景、推荐观察指标、历史锚点、置信度、画像版本、盲评状态和生成时间。

#### Scenario: 返回完整预测图结构
- **WHEN** 系统成功生成预测图
- **THEN** 响应 MUST 包含评测判断、强点、风险、预期表现区间和核心赌注
- **AND** 响应 MUST 包含反事实场景、推荐观察指标、历史锚点、置信度、画像版本、盲评状态和生成时间

#### Scenario: 历史锚点不足
- **WHEN** 系统缺少可诚实引用的历史锚点
- **THEN** 预测图 MUST 允许历史锚点为空
- **AND** 预测图 MUST 在置信度或盲评状态中表达锚点不足

### Requirement: 刷新预测图
系统 SHALL 支持刷新某个果实的当前预测图。刷新 MUST 新增一条预测图记录并将其标记为该果实最新预测图，MUST NOT 覆盖历史预测图主体判断。

#### Scenario: 刷新已有预测图
- **WHEN** 用户请求刷新已有预测图的果实
- **THEN** 系统 MUST 重新执行评测
- **AND** 系统 MUST 保存一条新的预测图记录
- **AND** 系统 MUST 将新记录作为该果实最新预测图返回

#### Scenario: 刷新无预测图的果实
- **WHEN** 用户请求刷新一个尚无预测图的果实
- **THEN** 系统 MUST 按生成预测图处理
- **AND** 系统 MUST 返回新生成的预测图

### Requirement: 读取果实最新预测图
系统 SHALL 提供读取某个果实最新预测图的能力。接口契约 MUST 落到 `docs/api/content-experiment-calibration.yaml` 的单一内容实验校准 Controller 中。

#### Scenario: 读取已有预测图
- **WHEN** 用户请求某个果实的最新预测图
- **THEN** 系统 MUST 返回该果实当前最新预测图
- **AND** 响应 MUST 与 `docs/api/content-experiment-calibration.yaml` 中的预测图 Schema 对齐

#### Scenario: 读取不存在的预测图
- **WHEN** 用户请求一个尚未评测果实的最新预测图
- **THEN** 系统 MUST 返回明确空态响应或未生成状态
- **AND** 系统 MUST 不伪造预测图内容

### Requirement: 提供预测图 API 契约
系统 SHALL 在 `docs/api/content-experiment-calibration.yaml` 中定义内容实验校准 Controller 的预测图接口。该 Controller MUST 至少包含读取最新预测图与生成/刷新预测图接口。

#### Scenario: 定义读取最新预测图接口
- **WHEN** 后端实现预测图读取能力
- **THEN** 系统 MUST 先在 `docs/api/content-experiment-calibration.yaml` 定义 `GET /api/fruits/{fruitId}/prediction-map`
- **AND** 代码实现 MUST 与该契约保持一致

#### Scenario: 定义生成或刷新预测图接口
- **WHEN** 后端实现预测图生成或刷新能力
- **THEN** 系统 MUST 先在 `docs/api/content-experiment-calibration.yaml` 定义 `POST /api/fruits/{fruitId}/prediction-map/evaluate`
- **AND** 代码实现 MUST 与该契约保持一致

### Requirement: 提供预测图 SQL 契约
系统 SHALL 在顶层 SQL 文档中定义内容实验校准所需表结构。评分画像 MUST 由 `docs/sql/evaluation_profiles.sql` 定义，果实预测图 MUST 由 `docs/sql/fruit_prediction_maps.sql` 定义。

#### Scenario: 定义评分画像表
- **WHEN** 后端实现评分画像持久化
- **THEN** 系统 MUST 先创建 `docs/sql/evaluation_profiles.sql`
- **AND** 该文件 MUST 只定义 `evaluation_profiles` 表及其索引约束

#### Scenario: 定义果实预测图表
- **WHEN** 后端实现预测图持久化
- **THEN** 系统 MUST 先创建 `docs/sql/fruit_prediction_maps.sql`
- **AND** 该文件 MUST 只定义 `fruit_prediction_maps` 表及其索引约束

### Requirement: 预测图不承诺真实平台表现
系统 SHALL 将预期表现区间表达为可校准判断和传播假设，不得表达为真实平台结果承诺，不得宣称模拟真实平台算法或虚拟用户群。

#### Scenario: 生成预测图时表达非承诺边界
- **WHEN** 系统返回预测图
- **THEN** 预测图 MUST 包含置信度和置信原因
- **AND** 预测图 MUST 不使用保证命中、必然爆发或等价表达

#### Scenario: 拒绝平台算法模拟声明
- **WHEN** Agent 输出声称已经模拟真实平台算法或虚拟用户群
- **THEN** 系统 MUST 将该输出视为不合格预测图候选
- **AND** 系统 MUST 进入修复流程或返回评测失败

### Requirement: MVP 不生成快照复盘和基因证据
系统 SHALL 在本次 MVP 中只维护当前预测图，不得创建预测快照、校准复盘或基因汲取证据。

#### Scenario: 生成预测图后不冻结快照
- **WHEN** 系统成功生成预测图
- **THEN** 系统 MUST 不创建预测快照记录
- **AND** 系统 MUST 不把该预测图标记为发布基线

#### Scenario: 生成预测图后不触发基因汲取
- **WHEN** 系统成功生成预测图
- **THEN** 系统 MUST 不创建基因汲取提醒
- **AND** 系统 MUST 不生成基因汲取证据
