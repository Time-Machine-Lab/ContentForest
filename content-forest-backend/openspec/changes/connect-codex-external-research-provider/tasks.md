## 1. 顶层文档与配置契约

- [x] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，将联网研究架构从自研双层搜索浏览修正为外部 Agent 委托研究优先。
- [x] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，说明 Codex 外部 Agent Provider、Provider Router、联网研究 Tool 与旧 Provider 的边界。
- [x] 1.3 更新后端 `.env.example`，新增 Codex 外部研究 Provider 的配置占位，并确保不包含真实密钥。

## 2. 配置与 Provider 接入

- [x] 2.1 扩展后端配置读取，支持 Codex 外部研究 Provider 的 base URL、API Key、wire API、模型、推理强度、鉴权方式、搜索上下文大小和超时时间。
- [x] 2.2 实现 Codex 外部 Agent Provider 的配置校验和脱敏配置摘要。
- [x] 2.3 将默认 Network Provider Router 收敛为 Codex 外部 Agent Provider 优先，确保 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider 默认不参与营养研究，但不删除这些 Provider 代码。

## 3. Codex Responses 调用

- [x] 3.1 实现 Codex 外部 Agent Provider 的 Responses 请求构造，包含 `model`、`reasoning.effort`、`tools.web_search`、`tool_choice` 和结构化输出 schema。
- [x] 3.2 实现 Responses HTTP 调用、超时控制、鉴权失败、网络失败和非 2xx 响应映射。
- [x] 3.3 实现 Responses 输出文本提取，兼容 `output[].content[].text` 和常见 Responses 输出结构。
- [x] 3.4 实现外部 Agent 结构化 JSON 解析与校验，校验失败时返回 Provider 失败而不是伪造研究结果。

## 4. 研究结果归一化与 Trace

- [x] 4.1 将外部 Agent 返回的候选资料归一化为现有联网研究结果，并默认标记为候选线索。
- [x] 4.2 支持外部 Agent 返回受限状态、未找到结果和经验性总结，并将其正确传递给营养研究 Skill。
- [x] 4.3 在联网研究 Trace 中记录 Provider 名称、模型、wire API、工具使用摘要、结果数量、耗时和失败原因。
- [x] 4.4 对 Trace、错误消息和 Agent 交流日志中的 API Key、Authorization Header、Bearer Token 和超长正文进行脱敏或裁剪。

## 5. 测试与验证

- [x] 5.1 增加 Codex 外部 Agent Provider 的单元测试，覆盖请求构造、成功响应解析和结果归一化。
- [x] 5.2 增加失败测试，覆盖缺少配置、鉴权失败、超时、非 2xx 响应、空输出和结构化 JSON 校验失败。
- [x] 5.3 增加默认 Router 测试，确认默认链路不启用 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider，且相关 Provider 代码仍可被测试或显式构造。
- [x] 5.4 增加 Trace 脱敏测试，确认真实 API Key 和 Authorization Header 不会进入日志或 Trace。
- [x] 5.5 运行 `npm run typecheck`、`npm run lint`、`npm test` 和 `openspec validate connect-codex-external-research-provider --strict`。
