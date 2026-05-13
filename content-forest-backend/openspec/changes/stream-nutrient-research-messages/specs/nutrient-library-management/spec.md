## ADDED Requirements

### Requirement: 营养研究会话必须兼容非流式与流式提交
营养研究会话能力 MUST 同时支持现有非流式消息提交和新增流式消息提交，且两者保存的系统事实必须保持一致。

#### Scenario: 使用现有非流式接口提交消息
- **WHEN** 前端调用 `POST /api/nutrient-research-sessions/{sessionId}/messages`
- **THEN** 系统 MUST 保持现有 JSON 响应行为
- **AND** 系统 MUST 不要求调用方切换到 SSE

#### Scenario: 使用新增流式接口提交消息
- **WHEN** 前端调用新增的营养研究消息流式接口
- **THEN** 系统 MUST 复用同一研究会话、研究消息和可沉淀营养块语义
- **AND** 系统 MUST 不新增独立于营养研究会话之外的任务系统

### Requirement: 流式研究不得破坏后端分层边界
营养研究流式提交 MUST 继续通过 Nutrient 应用服务和 AgentPort 执行，Controller 不得直接访问存储、内容文件或 Agent Runtime。

#### Scenario: Controller 处理 SSE 请求
- **WHEN** HTTP 层收到流式研究请求
- **THEN** Controller MUST 只负责请求解析、响应事件写出和错误映射
- **AND** 业务规则、消息保存、Agent 调用和可沉淀块保存 MUST 位于应用服务边界内
