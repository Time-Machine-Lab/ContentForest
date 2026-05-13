## ADDED Requirements

### Requirement: 营养库页面入口必须打开优化后的营养工作台
营养库页面中的种子专属营养库入口 MUST 打开与种子工作区一致的营养工作台体验，不得跳转到独立研究页面。

#### Scenario: 从种子专属营养库进入工作台
- **WHEN** 用户在营养库页面选择可用的种子专属营养库并打开营养工作台
- **THEN** 系统 MUST 在当前页面上下文中打开营养工作台弹层
- **AND** 弹层 MUST 支持营养卡片、Agent 研究和汲取建议的优化体验

### Requirement: 营养库页面不得绕过现有 API 契约
营养库页面接入优化后的营养工作台时 MUST 继续使用 `docs/api/nutrient.yaml` 中已有营养接口，不得在前端新增未定义接口。

#### Scenario: 工作台从营养库页面加载数据
- **WHEN** 营养工作台加载卡片、建议、会话或提交消息
- **THEN** 系统 MUST 调用 `docs/api/nutrient.yaml` 已定义的营养库、营养卡片、营养建议和研究会话接口
- **AND** 系统 MUST 不直接访问本地文件、数据库或 LLM
