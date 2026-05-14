## Context

内容森林第二期把营养库活化定义为“缺口发现 -> 联网研究 -> 卡片化整理 -> 临时引用 -> 沉淀入库 -> 使用回流”的循环。现有联网研究模块已经有 Provider Router、查询规划、公开网页搜索、Browser Action 和平台策略，但实际使用中暴露出三个问题：收费搜索 API 不适合当前成本目标，公开搜索慢且不稳定，小红书等平台直接浏览容易触发 IP 风控。

用户希望当前阶段不再自研复杂搜索和浏览器操作，而是将研究任务委托给具备搜索和浏览器能力的外部 Agent。已验证的 Codex Provider 具备 OpenAI Responses 兼容接口：`GET /v1/models` 可用，`POST /v1/responses` 可用，`gpt-5.5` 可用，`tools: [{ "type": "web_search" }]` 能触发联网搜索，`text.format=json_schema` 能返回结构化 JSON。

## Goals / Non-Goals

**Goals:**

- 接入 Codex 外部 Agent 作为联网研究默认 Provider。
- ContentForest 只负责生成研究指令、调用外部 Agent、校验结构化输出、归一化结果和记录 Trace。
- 通过环境配置管理 Codex Provider 的 base URL、API Key、模型、推理强度、wire API、搜索上下文和超时。
- 保留 Provider Router 抽象，使后续可以接入 OpenClaw 或其他 OpenResponses 兼容 Provider。
- 将默认链路从“自研搜索 + 浏览器深入探索”调整为“外部 Agent 委托研究”。

**Non-Goals:**

- 不实现新的平台爬虫、平台专项 Provider 或 Browser Action 策略。
- 不让后端直接操控 Codex 内部搜索步骤、浏览器动作或平台登录态。
- 不把外部 Agent 的候选资料自动写入正式营养库。
- 不在本次实现数据反馈监控器的外部 Agent 观测能力。
- 不新增数据库表；外部研究结果仍通过现有营养研究消息、可沉淀块和 Trace 承载。

## Decisions

### Decision 1: 使用 Codex External Research Provider 作为默认研究入口

实现一个 `CodexExternalResearchProvider`，作为 `NetworkProvider` 或 `NetworkSearchProvider` 接入 Provider Router。它接收 `NetworkResearchRequest` 和查询规划结果，组装给外部 Codex Agent 的研究指令，并通过 Responses API 调用外部 Provider。

替代方案是继续维护 Brave/Tavily/SerpApi/PublicWebSearch/BrowserAction 的组合链路。但这些能力要么收费，要么不稳定，要么平台适配成本过高，不适合当前阶段。

### Decision 2: 采用 Responses 兼容 wire API，而不是 Chat Completions

Codex Provider 已验证支持 `/v1/responses`，并且 `web_search` 与结构化输出都能工作。Provider 调用使用：

- `POST {baseUrl}/responses`
- `Authorization: Bearer <apiKey>`
- `model`
- `reasoning.effort`
- `tools: [{ type: "web_search", search_context_size }]`
- `tool_choice: "required"`
- `text.format: json_schema`

这样可以强制外部 Agent 进行联网研究，并以结构化 JSON 返回。Chat Completions 不适合承载 web_search 与结构化研究来源。

### Decision 3: 外部 Agent 输出使用“研究包”结构，再映射为现有 RawNetworkResearchItem

外部 Agent 的结构化输出应表达：

- 给用户看的研究总结
- 可沉淀营养建议
- 候选案例或资料条目
- 每个条目的标题、链接、摘要、平台、来源、观察依据
- 失败或限制说明

后端将这些条目归一化为现有 `RawNetworkResearchItem`，并标记 Provider 为 `codex_external_research`。由于外部 Agent 的结果来自委托研究，不等同于后端亲自打开页面验证，默认应标记为 `candidate_lead`；只有外部 Agent 明确提供可追溯的页面观察证据时，才允许升级为已观察案例。

### Decision 4: 默认停用付费搜索和自研浏览器深入探索

默认 Router 第一版只注册 Codex 外部研究 Provider。现有 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider 必须关闭默认启用，但不删除代码。它们保留代码和测试价值，后续若需要本地降级、调试、专项平台验证或重新启用浏览器探索，可通过显式配置恢复。

这样可以避免用户无意中触发收费搜索，也避免 Browser Action 在小红书等平台上反复触发风控。

### Decision 5: Trace 必须脱敏且表达委托过程

Trace 记录外部 Provider 名称、模型、wire API、是否触发 web_search、结果数量、失败原因、耗时和输出校验状态。Trace 不记录 API Key、完整 Authorization header、超长外部输出、Cookie 或本地绝对路径。

### Decision 6: 顶层文档同步改写研究架构

`docs/内容森林第二期开发规划文档.md` 当前描述的是“初步搜索 + 深入探索”两层架构，需要调整为“外部 Agent 委托研究优先”。`docs/design/内容森林Agent架构设计文档.md` 需要说明联网研究 Tool 的默认实现变为外部 Agent Provider，而 Browser Action 是可替换实现细节，不是当前默认入口。

## Risks / Trade-offs

- 外部 Provider 不可用或超时 -> 返回结构化失败，前端显示研究失败原因，不伪造营养结果。
- 外部 Agent 输出不符合 JSON Schema -> 尝试一次修复或直接返回校验失败，并记录脱敏 Trace。
- 外部 Agent 编造来源 -> Prompt 和 Schema 要求必须区分“有来源链接的资料”和“经验性总结”，后端对无链接条目降级为普通摘要，不当作案例。
- Responses 兼容性与 OpenAI 官方存在差异 -> 实现时以探针验证过的最小字段为准，不依赖不稳定字段。
- 高推理强度慢且 token 高 -> 通过超时配置、搜索上下文配置、输出结构约束和流式/异步研究体验缓解。
- API Key 泄露风险 -> 只从 `.env.local` 读取，示例文件使用占位，日志和 Trace 必须脱敏。

## Migration Plan

1. 增加 Codex 外部研究 Provider 的配置读取和默认 Router 注册。
2. 实现 Responses 请求构造、结构化输出解析、失败映射和结果归一化。
3. 将默认 Provider 链路收敛到 Codex 外部研究 Provider，旧 Provider 保留但默认不启用。
4. 更新顶层文档和示例环境变量。
5. 增加单元测试覆盖成功、失败、结构化输出不合法、Key 缺失、Trace 脱敏和默认 Router 行为。

Rollback 策略：如果 Codex Provider 不稳定，可以通过配置关闭外部 Provider，并恢复现有 PublicWebSearch 或 BrowserResearch 显式注册作为临时降级。

## Open Questions

- 是否需要在本次实现中支持 OpenClaw Provider，还是等 Codex Provider 稳定后再抽象第二个实现？
- 外部 Agent 输出中“已观察案例”的证据标准是否需要更严格，例如必须包含来源链接、可见正文摘要和互动数据？
- 前端是否需要展示“由外部 Agent 研究生成”的来源标识？
