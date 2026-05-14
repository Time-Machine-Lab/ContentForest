## Why

当前联网研究链路依赖自研 Search Provider、公开网页搜索和 Browser Action，面对小红书、抖音等平台时容易受收费搜索、页面风控、DOM 变化和浏览器维护成本影响。内容森林的目标不是复刻搜索引擎或平台爬虫，而是为营养汲取提供高质量外部资料，因此需要将复杂搜索与浏览器分析委托给具备联网搜索能力的外部 Agent。

## What Changes

- 新增 Codex 外部 Agent 研究 Provider，通过 Responses 兼容接口把营养研究任务委托给外部 Codex Provider。
- 将联网研究默认入口收敛为外部 Agent 委托研究，暂停默认启用收费搜索 API、自研公开网页搜索和平台浏览器深入探索。
- 关闭但不删除 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider 代码；这些实现保留为后续显式启用、调试或降级能力。
- 支持通过环境配置启用 Codex Provider 的 base URL、API Key、模型、推理强度、Responses wire API、搜索上下文和超时时间。
- 要求外部 Agent 返回结构化研究结果，后端只负责校验、归一化、Trace 记录和交付给营养研究 Skill。
- 保留现有 Provider Router 抽象，以便后续接入 OpenClaw 或其他 OpenResponses 兼容外部 Agent。
- 同步更新 `docs/内容森林第二期开发规划文档.md` 与 `docs/design/内容森林Agent架构设计文档.md`，把联网研究架构从“初步搜索 + 深入探索”修正为“外部 Agent 委托研究优先”。

## Capabilities

### New Capabilities

<!-- None. This change modifies the existing networked research capabilities instead of introducing a separate product capability. -->

### Modified Capabilities

- `networked-research-module`: 将联网研究 Provider 的默认行为改为 Codex 外部 Agent 委托研究，并定义配置、失败、归一化和安全边界。
- `networked-research-discovery-pipeline`: 将原双层搜索/浏览器发现流程降级为可替换实现细节，新增外部 Agent 委托研究作为默认发现管线。

## Impact

- 后端 Agent 联网研究模块：新增 Codex 外部 Agent Provider，调整默认 Provider Router 注册顺序。
- 后端配置：新增 Codex 外部研究 Provider 的环境变量读取与启动校验。
- 营养研究 Skill：继续通过现有联网研究 Tool 获取上下文包，不直接感知 Codex Provider。
- 文档：更新第二期开发规划、Agent 架构设计以及必要的环境配置说明。
- 测试：增加 Codex Provider 请求构造、结构化响应解析、失败映射、默认 Router 行为和脱敏 Trace 测试。
