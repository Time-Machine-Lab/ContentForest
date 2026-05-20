## ADDED Requirements

### Requirement: 营养研究会话查询契约必须归属于营养库接口文档
后端 SHALL 在 `docs/api/nutrient.yaml` 中维护营养研究会话创建、详情、消息、流式提交、可沉淀块和种子级会话列表接口。营养研究会话相关 HTTP 能力 MUST 归属于单一 nutrient Controller 契约。

#### Scenario: 新增种子级会话列表接口
- **WHEN** 后端新增按种子查询营养研究会话的 HTTP 能力
- **THEN** 系统 MUST 更新 `docs/api/nutrient.yaml`
- **AND** 系统 MUST 不新增第二份营养研究专用 API 文档

#### Scenario: 更新流式事件契约
- **WHEN** 后端新增或修改营养研究 SSE 事件类型
- **THEN** 系统 MUST 在 `docs/api/nutrient.yaml` 中描述事件类型、事件字段和错误语义
- **AND** 前端 MUST 能根据该文档更新类型定义
