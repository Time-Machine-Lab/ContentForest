## ADDED Requirements

### Requirement: 支持 Codex 外部 Agent 委托研究 Provider
系统 SHALL 提供 Codex 外部 Agent 委托研究 Provider，用于将联网研究任务交给外部 Codex Provider 执行。该 Provider MUST 通过 Responses 兼容接口调用外部 Agent，并 MUST 将外部 Agent 返回的结构化研究结果归一化为联网研究上下文包。

#### Scenario: 调用 Codex 外部 Agent 执行研究
- **WHEN** 营养研究 Skill 请求补充外部平台资料
- **THEN** 系统 MUST 通过 Codex 外部 Agent Provider 调用配置的 Responses 接口
- **AND** 请求 MUST 包含研究指令、模型、推理强度和联网搜索工具配置
- **AND** 系统 MUST 将返回结果转换为统一联网研究结果

#### Scenario: Codex Provider 未配置
- **WHEN** Codex 外部 Agent Provider 未配置 base URL、API Key 或模型
- **THEN** 系统 MUST 返回 Provider 不可用原因
- **AND** 系统 MUST NOT 尝试调用未配置完整的外部 Provider

### Requirement: Codex 外部 Agent 配置必须来自环境变量
系统 SHALL 允许开发者通过后端本地环境变量配置 Codex 外部 Agent Provider。配置 MUST 至少包含 base URL、API Key、wire API、模型、推理强度、鉴权方式、搜索上下文大小和超时时间。

#### Scenario: 读取 Codex 外部 Agent 配置
- **WHEN** 后端启动并加载本地环境配置
- **THEN** 系统 MUST 读取 Codex 外部 Agent Provider 的配置项
- **AND** 系统 MUST 使用占位示例而不是在示例文件中保存真实密钥

#### Scenario: 鉴权信息脱敏
- **WHEN** 系统记录 Provider 配置摘要、Trace 或失败原因
- **THEN** 系统 MUST NOT 记录真实 API Key、Authorization Header 或 Bearer Token
- **AND** 系统 MAY 记录 Provider 名称、模型、wire API 和脱敏后的配置状态

### Requirement: 外部 Agent 输出必须结构化校验
系统 SHALL 要求 Codex 外部 Agent 返回结构化研究输出。系统 MUST 校验输出中可沉淀营养、候选资料、来源链接、摘要和限制说明的格式；校验失败时 MUST 返回可理解失败原因，MUST NOT 将不可解析内容当作有效研究结果。

#### Scenario: 结构化输出有效
- **WHEN** Codex 外部 Agent 返回符合契约的结构化研究结果
- **THEN** 系统 MUST 提取研究总结、候选资料和可沉淀营养建议
- **AND** 系统 MUST 将候选资料归一化为联网研究结果

#### Scenario: 结构化输出无效
- **WHEN** Codex 外部 Agent 返回非 JSON、缺少必要字段或字段类型不正确
- **THEN** 系统 MUST 将本次 Provider 调用标记为失败
- **AND** 系统 MUST NOT 伪造候选资料或可沉淀营养

### Requirement: 外部 Agent 研究结果默认作为候选线索
系统 SHALL 将 Codex 外部 Agent 返回的资料默认标记为候选线索。只有当外部 Agent 明确提供可追溯页面观察证据时，系统 MAY 将结果标记为已观察案例；系统 MUST NOT 仅凭模型总结将资料标记为完整已观察案例。

#### Scenario: 返回候选线索
- **WHEN** Codex 外部 Agent 返回带来源链接和摘要的研究资料
- **THEN** 系统 MUST 将该资料标记为候选线索
- **AND** 系统 MUST 保留来源链接和摘要以供用户判断

#### Scenario: 缺少来源链接
- **WHEN** Codex 外部 Agent 返回没有来源链接的经验性总结
- **THEN** 系统 MUST 将其作为普通研究摘要或可沉淀建议处理
- **AND** 系统 MUST NOT 将其归一化为真实案例链接

### Requirement: 联网研究默认 Provider 必须收敛到外部 Agent
系统 SHALL 将 Codex 外部 Agent Provider 作为联网研究默认入口。`ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider MUST NOT 在默认配置下参与营养研究；系统 MUST 保留这些 Provider 的代码，不得在本变更中删除它们。

#### Scenario: 默认执行联网研究
- **WHEN** 后端使用默认 Provider Router 执行营养研究
- **THEN** 系统 MUST 优先使用 Codex 外部 Agent Provider
- **AND** 系统 MUST NOT 默认调用 Brave、Tavily、SerpApi、公开网页搜索或 Browser Action

#### Scenario: 保留旧 Provider 代码
- **WHEN** 实现本变更
- **THEN** 系统 MUST 保留 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 和平台专项 Provider 的代码
- **AND** 系统 MUST 只移除或关闭它们在默认 Provider Router 中的默认启用路径

#### Scenario: 显式启用降级 Provider
- **WHEN** 开发者通过配置显式启用其他联网研究 Provider
- **THEN** 系统 MAY 注册对应 Provider
- **AND** Trace MUST 标明实际使用的 Provider

### Requirement: Codex 外部 Agent 调用必须记录可诊断 Trace
系统 SHALL 为 Codex 外部 Agent 调用记录可诊断 Trace。Trace MUST 表达 Provider 名称、模型、wire API、是否请求 web search、结果数量、耗时、失败原因和输出校验状态，并 MUST 对密钥、超长正文和敏感内容脱敏或裁剪。

#### Scenario: 记录成功委托研究 Trace
- **WHEN** Codex 外部 Agent Provider 成功返回研究结果
- **THEN** Trace MUST 记录 Provider 名称、模型、工具使用摘要、结果数量和耗时
- **AND** Trace MUST NOT 泄露 API Key 或完整外部输出正文

#### Scenario: 记录失败委托研究 Trace
- **WHEN** Codex 外部 Agent Provider 网络失败、超时、鉴权失败或输出校验失败
- **THEN** Trace MUST 记录失败类型和可理解原因
- **AND** Trace MUST NOT 泄露真实请求头、API Key 或 Bearer Token
