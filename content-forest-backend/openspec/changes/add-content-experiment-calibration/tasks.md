## 1. 顶层契约文档

- [ ] 1.1 创建 `docs/sql/evaluation_profiles.sql`，定义 `evaluation_profiles` 表、画像版本、作用范围、评测维度、区间策略、启用状态和索引约束
- [ ] 1.2 创建 `docs/sql/fruit_prediction_maps.sql`，定义 `fruit_prediction_maps` 表、果实引用、画像引用、预测图主体 JSON、置信度、盲评状态、最新标记、生成时间和索引约束
- [ ] 1.3 创建 `docs/api/content-experiment-calibration.yaml`，定义单一内容实验校准 Controller 的预测图读取与生成/刷新接口
- [ ] 1.4 对齐 API Schema 与 SQL 字段，确保预测图响应包含评测判断、强点、风险、预期表现区间、核心赌注、反事实场景、观察指标、历史锚点、置信度、画像版本、盲评状态和生成时间

## 2. 数据库与领域模型

- [ ] 2.1 添加内容实验校准数据库迁移，按 SQL 文档创建评分画像表和果实预测图表
- [ ] 2.2 添加默认评分画像种子数据，确保首次启用时存在可用画像版本
- [ ] 2.3 实现 EvaluationProfile、PredictionMap、Confidence、BlindEvaluationState 等领域类型和值对象
- [ ] 2.4 实现 PredictionMap Repository，支持保存预测图、标记最新预测图、按果实读取最新预测图

## 3. 应用服务与 Controller

- [ ] 3.1 实现内容实验校准应用服务，支持读取最新预测图、生成预测图、刷新预测图
- [ ] 3.2 接入果实领域读取能力，校验果实存在且不改变果实 Markdown、物竞天择状态或发布状态
- [ ] 3.3 实现内容实验校准 Controller，严格匹配 `docs/api/content-experiment-calibration.yaml`
- [ ] 3.4 实现未生成、果实不存在、Agent 失败、结构校验失败等错误响应

## 4. Agent Runtime 与 Skill

- [ ] 4.1 扩展 Agent 任务类型，允许 `fruit_evaluation` 任务通过 AgentPort 执行
- [ ] 4.2 实现果实评测只读 Tool，仅读取授权果实正文、必要系统事实和授权评分画像
- [ ] 4.3 实现内置果实评测 Agent Skill，参考 `cheat-score` 的结构化维度评测和 `cheat-score-blind` 的盲评边界
- [ ] 4.4 实现预测图候选 Schema 校验和有限自检修复，拒绝承诺式平台预测、虚拟用户模拟和污染输入
- [ ] 4.5 扩展 Agent Trace，记录果实读取、画像读取、盲评检查、LLM 评测、结构化校验、修复和失败原因

## 5. 测试与验证

- [ ] 5.1 添加 SQL/API 文档契约校验或快照测试，确保实现与 `docs/sql/`、`docs/api/` 对齐
- [ ] 5.2 添加内容实验校准领域服务单元测试，覆盖生成、刷新、读取、未生成和果实不存在场景
- [ ] 5.3 添加 Repository 测试，覆盖最新预测图切换和历史记录不覆盖
- [ ] 5.4 添加果实评测 Skill 测试，覆盖盲评 Tool 权限、污染数据拒绝、Schema 校验和修复失败
- [ ] 5.5 添加 Controller 测试，覆盖 `GET /api/fruits/{fruitId}/prediction-map` 与 `POST /api/fruits/{fruitId}/prediction-map/evaluate`
- [ ] 5.6 运行后端测试与 OpenSpec 校验，确认本 change 的 proposal、design、specs、tasks 全部可用
