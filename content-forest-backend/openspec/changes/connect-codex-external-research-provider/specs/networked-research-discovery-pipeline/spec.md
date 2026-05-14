## ADDED Requirements

### Requirement: 联网研究发现管线必须支持外部 Agent 委托模式
系统 SHALL 支持外部 Agent 委托研究模式。该模式下，系统 MUST 将用户研究请求、目标平台、期望结果数量和输出契约组装为研究指令，并将搜索、浏览、资料判断和初步总结交给外部 Agent 完成。

#### Scenario: 生成外部 Agent 研究指令
- **WHEN** 用户请求研究某个平台的内容案例、趋势或表达规律
- **THEN** 系统 MUST 生成清晰的外部 Agent 研究指令
- **AND** 指令 MUST 要求外部 Agent 区分真实来源、经验总结、限制状态和可沉淀营养建议

#### Scenario: 外部 Agent 自主执行搜索和浏览
- **WHEN** Codex 外部 Agent Provider 接收到研究指令
- **THEN** ContentForest MUST NOT 规定具体搜索引擎、浏览器步骤或平台 DOM 读取逻辑
- **AND** 外部 Agent MAY 自主使用其具备的联网搜索或浏览能力完成研究

### Requirement: 外部 Agent 委托模式必须替代默认双层搜索浏览流程
系统 SHALL 将“初步搜索 + 深入探索”的双层流程作为可替换实现细节保留，但默认联网研究 MUST 使用外部 Agent 委托模式。系统 MUST NOT 在默认营养研究中强制执行本地 Query Planner 搜索词拆分、搜索 Provider 调用和 Browser Action 平台策略。

#### Scenario: 默认委托研究
- **WHEN** 营养研究任务请求联网资料
- **THEN** 系统 MUST 通过外部 Agent 委托模式获取研究资料
- **AND** 系统 MUST NOT 默认启动本地 Browser Action 深入探索

#### Scenario: 旧双层流程作为非默认能力
- **WHEN** 开发者显式启用旧双层搜索浏览 Provider
- **THEN** 系统 MAY 继续使用初步搜索和深入探索流程
- **AND** Trace MUST 明确该流程是显式启用的降级或调试路径

### Requirement: 外部 Agent 研究指令必须约束不可编造结果
系统 SHALL 在外部 Agent 研究指令中明确要求不得编造真实平台案例、链接、互动数据或来源。系统 MUST 要求外部 Agent 将“未找到”“访问受限”“只能给出经验总结”等情况作为结构化限制状态返回。

#### Scenario: 找不到真实案例
- **WHEN** 外部 Agent 无法找到满足条件的真实案例或来源链接
- **THEN** 外部 Agent 输出契约 MUST 允许返回空案例列表和限制说明
- **AND** 系统 MUST 将该状态交付给营养研究 Skill
- **AND** 系统 MUST NOT 自动补写虚构案例

#### Scenario: 平台访问受限
- **WHEN** 外部 Agent 遇到登录墙、验证码、IP 风控或平台访问限制
- **THEN** 外部 Agent 输出契约 MUST 允许返回受限状态和诊断摘要
- **AND** 系统 MUST 将其记录为 Provider 限制而不是有效研究结果

### Requirement: 外部 Agent 委托研究必须兼容营养研究会话
系统 SHALL 保持营养研究会话的用户体验不变。用户在营养工作台中发起研究对话时，系统 MUST 仍返回普通 Agent 回复和可沉淀营养块；外部 Agent Provider 的存在 MUST 对前端会话模型透明。

#### Scenario: 营养研究会话使用外部 Agent 结果
- **WHEN** 用户在营养研究会话中提交研究问题
- **THEN** 后端 MUST 通过联网研究 Tool 获取外部 Agent 研究上下文
- **AND** 营养研究 Skill MUST 基于该上下文生成普通回复和可沉淀营养块

#### Scenario: 外部 Agent 研究失败
- **WHEN** 外部 Agent Provider 调用失败或返回不可用状态
- **THEN** 营养研究会话 MUST 保存可理解的失败回复
- **AND** 系统 MUST NOT 保存虚假的可沉淀营养块

### Requirement: 顶层文档必须同步外部 Agent 委托研究架构
系统 SHALL 在实现 Codex 外部 Agent Provider 时同步更新顶层设计文档。第二期开发规划 MUST 描述营养库活化如何委托外部 Agent 研究；Agent 架构设计 MUST 描述联网研究 Tool、Provider Router、Codex 外部 Agent Provider 和旧搜索浏览 Provider 的边界。

#### Scenario: 更新第二期开发规划
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/内容森林第二期开发规划文档.md`
- **AND** 文档 MUST 说明当前默认不自研复杂搜索与浏览器操作

#### Scenario: 更新 Agent 架构设计
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/design/内容森林Agent架构设计文档.md`
- **AND** 文档 MUST 说明 Codex 外部 Agent Provider 是当前默认联网研究实现
