## Context

内容森林第二期正在把营养库从静态资料存储升级为可持续补充、引用和沉淀的种子级营养工作台。当前后端已经具备营养汲取 Agent 的雏形，但联网能力仍接近单一搜索 Tool：查询词由 Agent 直接组织，结果来源单薄，无法稳定处理“搜索小红书爆款 AI 产品宣传帖”这类需要平台内观察、站内搜索或第三方社媒数据源的任务。

这次变更不建设庞大的平台情报系统，而是在 Agent Tool 层引入轻量的联网研究模块。它为营养汲取 Agent 提供“发现资料、读取页面、观察真实网站、归一化结果”的基础能力，最终产物仍然是可沉淀营养卡片或普通对话消息。

## Goals / Non-Goals

**Goals:**
- 将现有单一搜索能力升级为可插拔 Research Provider 架构。
- 支持 Query Planner 将用户自然语言研究请求拆为多条可执行查询。
- 支持通用搜索、网页抓取、浏览器观察、平台专项 provider 的统一路由。
- 第一版通过 `agent-browser.dev` 接入真实网页观察能力，并通过 session 隔离和并发池降低互相干扰。
- 为营养汲取 Agent 提供归一化研究上下文包，避免“搜索为空就直接失败”。
- 保持所有联网结果只作为参考资料，不让 Agent 自动污染正式营养库。
- 将该架构同步至第二期开发规划和 Agent 架构设计文档。

**Non-Goals:**
- 不实现大型平台情报工作区。
- 不承诺稳定批量抓取小红书、抖音全量爆款数据。
- 不绕过平台登录、验证码、风控或服务条款。
- 不把浏览器工具作为唯一数据源。
- 不在本次变更中实现平台适应度评估器。
- 不让搜索模块直接决定内容是否会爆。

## Decisions

### Decision 1: 联网研究模块作为 Agent Tool 层能力

联网研究应作为受控 Tool 暴露给 Agent，而不是让业务模块直接调用外部搜索服务。这样可以复用 Agent Runtime 的任务上下文、授权范围、Trace、失败包装和测试替身。

备选方案是把搜索写进营养领域服务，但这会让领域层直接依赖外部搜索供应商，也会削弱 Agent 自主研究能力。

### Decision 2: 使用 Research Provider Router 而不是绑定单一工具

模块内部定义统一的 Research Provider 语义：通用搜索 provider、网页抓取 provider、浏览器观察 provider、平台专项 provider。Provider Router 根据研究意图、目标平台、配置可用性和失败情况选择 provider。

第一版可先接入一个通用搜索 provider 与一个 browser provider；Firecrawl/XCrawl、Apify、ScrapeCreators、xiaohongshu-mcp 等后续以 provider 形式扩展。

### Decision 3: Query Planner 负责拆分研究请求

用户输入不应被原样塞给搜索 API。Query Planner 需要从研究请求中提取平台、对象、内容类型、案例数量和意图，并生成多条查询。例如“搜索小红书爆款 AI 产品宣传帖”应拆为“AI 产品 小红书 种草”“AI 效率工具 小红书 爆款”“AI 产品 安利 小红书”等查询。

Planner 第一版可以是轻量规则 + LLM 规划，必须有确定性兜底，防止规划失败导致任务不可用。

### Decision 4: `agent-browser.dev` 作为第一版浏览器观察工具

`agent-browser.dev` 是 CLI 型浏览器自动化工具，适合以子进程方式封装为 Browser Research Provider。它能真实打开网站、操作页面、读取可见文本和截图，适合弥补通用搜索无法覆盖的平台页面观察。

接入时必须强制使用任务级 session，例如 `nutrient-task-{taskId}`；同一 session 内串行执行，不同 session 通过全局并发池限制，第一版建议并发 1 到 2，最大不超过 3。

### Decision 5: 归一化结果先于 Agent 总结

不同 provider 返回的结果必须先归一化为统一研究结果，再交给 Agent 总结。统一结果应表达标题、链接、来源、摘要、发布时间、互动数据、抓取时间、来源方式、新鲜度和原始片段摘要。

这样可以避免某个 provider 的返回格式污染上层 Skill，也方便后续做去重、排序、使用回流和质量排查。

### Decision 6: 顶层文档同步属于本次任务

该模块是第二期营养库活化的基础设施，不只是一个后端 Tool。实现任务必须同步更新第二期开发规划、Agent 架构设计和必要的 API/SQL 顶层文档，使后续开发者理解“联网研究模块”与“营养汲取任务”“内容进化管线”的关系。

## Risks / Trade-offs

- [Risk] 浏览器观察不稳定，可能遇到登录、验证码、反爬和页面结构变化 → 通过 provider 降级、超时、失败原因返回和人工可重试降低影响。
- [Risk] 多用户或多任务共享浏览器会互相干扰 → 强制任务级 session，同一 session 串行执行，系统全局限制并发。
- [Risk] 通用搜索拿不到社媒平台内部真实数据 → 将通用搜索定位为资料发现，平台数据交给 browser provider 或平台专项 provider。
- [Risk] 外部 provider API key 或 CLI 缺失导致功能不可用 → 启动时进行能力探测，任务执行时返回可理解的不可用原因，测试使用 fake provider。
- [Risk] Agent 将搜索结果当作事实或系统指令 → Skill 必须把研究结果标注为参考资料，最终沉淀仍需用户确认。

## Migration Plan

第一步保留现有 `controlled_web_search` 行为，并在其外侧引入新的 Research Provider 抽象和 fake provider 测试。第二步让营养汲取 Skill 改用联网研究模块生成研究上下文包。第三步接入 `agent-browser.dev` provider，并默认关闭或低并发启用。第四步根据环境配置逐步启用通用搜索、网页抓取和平台专项 provider。

如果新模块不稳定，可以通过配置回退到现有受控搜索工具，不影响营养卡片生命周期、枝化生长和基因汲取主链路。

## Open Questions

- 第一版通用搜索 provider 选择 Tavily、Brave Search API 还是沿用现有 provider 再扩展？
- `agent-browser.dev` 的登录态是否仅使用系统研究账号，还是未来支持用户级账号隔离？
- 小红书专项 provider 第一版优先验证 `xiaohongshu-mcp` 还是 Apify Actor？
