## Why

用户在内容森林工作区点击果实时，当前只能阅读正文、基因标签和物竞天择状态，仍难以判断这颗果实“为什么可能有效、风险在哪里、预期表现大概在哪个区间”。本变更在果实详情中接入预测图 UI，让用户在选择、淘汰或继续观察前获得可解释的果实评测视图。

## What Changes

- 在种子工作区的果实详情面板中新增“预测图”视图或面板，只对果实节点展示。
- 读取后端 `add-content-experiment-calibration` 变更提供的最新预测图 API，展示当前果实的评测判断、内容强点、内容风险、预期表现区间、核心赌注、反事实场景、推荐观察指标、置信度与盲评状态。
- 支持用户为当前果实生成或刷新预测图；操作完成后刷新面板内容。
- 提供空态、生成中、失败、低置信度和不可用状态，确保用户知道这是预测判断而非平台结果承诺。
- 保持果实物竞天择操作仍属于现有果实详情逻辑；预测图只辅助判断，不自动选择、淘汰或发布果实。
- 不新增前端自定义 API、SQL 或本地持久化数据结构；所有接口和数据结构均依赖后端顶层 `docs/api/content-experiment-calibration.yaml` 与对应 SQL 文档落地。
- 本次不实现预测快照冻结 UI、发布后校准复盘 UI、基因证据交付 UI、评分画像管理 UI、虚拟用户模拟或平台算法模拟。

## Capabilities

### New Capabilities

- `fruit-prediction-map-ui`: 定义果实详情中的预测图读取、生成/刷新、展示、状态处理和后端契约依赖。

### Modified Capabilities

- `content-forest-workbench`: 在工作区果实详情中新增预测图入口与展示区域，并保持节点选择、物竞天择、发布记录、数据回流和枝化生长交互边界不变。

## Impact

- 前端工作区：影响种子工作区右侧果实详情面板、API client、状态管理与组件测试。
- 后端依赖：依赖后端 change `add-content-experiment-calibration` 提供 `docs/api/content-experiment-calibration.yaml` 中的预测图读取与生成/刷新接口。
- 设计系统：遵循 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 风格，预测图应是紧凑的工作台工具面板，而不是营销式解释页。
- 数据边界：前端不得修改 SQL 文档，不得自行定义预测图字段，不得从果实 Markdown 中解析评测结果。
