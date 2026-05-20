## Context

小红书之外的营养研究需求会覆盖 TikTok、抖音、Instagram、微博、B 站、YouTube、快手、知乎、LinkedIn、Reddit、微信、Twitter/X、Threads 等平台。旧的 Brave/Tavily/SerpApi/PublicWebSearch 路径只能提供网页候选线索，无法稳定获得平台原生详情和互动数据；OpenClaw 委托链路又不够可控。TikHub MCP 提供 hosted MCP servers，公开探测显示其支持多平台 MCP endpoint，并提供健康检查和平台列表。

本设计延续 Agent 架构文档的受控 Tool 边界：Agent 只能调用 `networked_research`，不能直接拿到 TikHub API key、MCP session id 或工具列表。Provider Router 负责平台识别、工具映射、结果归一化、Trace 和降级。

## Goals / Non-Goals

**Goals:**

- 接入 TikHub MCP Provider，默认覆盖 TikHub 支持的所有非小红书社媒平台数据采集。
- 默认使用 Streamable HTTP MCP transport，后端内部封装 MCP initialize、tools/list、tools/call。
- 建立平台能力矩阵，按平台声明搜索、详情补全、作者信息、评论、互动指标等能力，并在能力不足时返回结构化受限状态。
- 支持 Twitter/X AI 产品相关帖子搜索和详情/数据采集验收。
- 保留 Codex external research，在平台未知、结果不足或需求宽泛时进行全网补盲和深度分析。
- TikHub Provider 默认排除 Xiaohongshu，避免误用高成本接口。

**Non-Goals:**

- 不把 TikHub MCP 工具直接注册为 Agent Tool。
- 不启用 TikHub 中需要平台用户 Cookie 的私域/账号态工具。
- 不支持写操作类社交行为，例如评论、点赞、关注、发布。
- 不在本变更中实现小红书采集；小红书由 xiaohongshu-cli 提案负责。
- 不新增数据库表；验收数据写入提案目录 Markdown。

## Decisions

### Decision 1: 使用 Streamable HTTP，而不是 Stdio/SSE/Curl

TikHub hosted MCP 的生产接入应使用 `https://mcp.tikhub.io/{platform}/mcp` Streamable HTTP。后端是服务进程，原生 HTTP client 更容易做超时、重试、鉴权、Trace 和测试。

替代方案：

- Stdio：适合 Claude Desktop、VS Code 等桌面 MCP client，需要 `npx mcp-remote` 桥接，不适合后端服务默认路径。
- SSE：适合旧客户端兼容，不作为新实现首选。
- Curl：适合人工调试，不适合作为系统集成。

### Decision 2: Provider 内部维护 MCP session 和工具映射

`TikHubMcpPlatformProvider` 负责：

- 根据平台 slug 初始化 MCP server。
- 保存 `mcp-session-id`。
- 缓存 `tools/list` 的工具 schema 和名称。
- 维护默认平台列表、平台别名和平台能力矩阵。
- 根据平台和研究意图选择搜索/详情工具。
- 调用 `tools/call` 并解析返回的 JSON/string result。

第一版必须完成 TikHub 非小红书社媒平台的注册、路由、工具发现、能力表达和安全过滤；Twitter/X 作为首个完整验收平台实现搜索、详情和互动数据归一化。其他平台通过同一能力矩阵进入系统：有安全可用的搜索/详情工具时执行采集，缺少工具或字段时返回受限状态，后续可逐个平台增加专属字段映射和验收样例。

默认平台集合来自 TikHub platforms 能力发现和配置覆盖，初始内容平台包括：`tiktok`、`douyin`、`instagram`、`weibo`、`bilibili`、`youtube`、`kuaishou`、`zhihu`、`linkedin`、`reddit`、`wechat`、`twitter`、`threads`。`others` 和 `tikhub utilities` 可进入工具发现和诊断，但不作为默认帖子证据来源，除非工具 schema 明确表示其为公开内容搜索/详情能力。

### Decision 3: 平台路由排除小红书

TikHub 平台列表中包含 Xiaohongshu，但本系统默认把小红书交给 xiaohongshu-cli Provider。TikHub Provider 的 `excludedPlatforms` 默认包含 `xiaohongshu`、`xhs`、`rednote`。

如果用户明确要求小红书，Router 不应调用 TikHub MCP，除非后续配置显式允许付费 fallback。

### Decision 4: Codex external research 是 coverage gate 后的补盲层

TikHub Provider 首先提供平台实采证据。只有以下情况触发 Codex：

- 用户没有明确平台，且研究范围是行业/竞品/趋势/方法论。
- TikHub 不支持目标平台或没有匹配工具。
- TikHub 返回的 `complete_observed_case` 少于目标数量。
- 用户要求“全网调研”“深入研究”“竞品分析”“方法总结”等超出平台帖子采集的任务。

Codex 输出应标记为 `candidate_lead` 或 `synthesis`，不能直接覆盖 TikHub 采集到的平台事实字段。

### Decision 5: 平台数据进入统一 Evidence 结构

TikHub 返回的数据需要映射为统一研究结果，至少表达：标题/正文或文本、链接/帖子 ID、作者、平台、发布时间、点赞/评论/转发/浏览等互动数据、采集时间、Provider 名称和 resultQuality。平台特有字段进入 raw metadata，能力矩阵标记哪些字段是平台原生返回、哪些字段缺失。

Twitter/X 第一版重点字段为：tweet id、url、text、author handle/name、created_at、likes、replies、retweets/reposts、quotes、views（如果可得）。字段缺失时保持缺失，不伪造。

### Decision 6: 验收 Markdown 是提案目录下的工程产物

实现验收时运行 Twitter/X 采集任务，关键词可使用 `AI product`、`AI 产品` 或与用户需求一致的等价查询，收集 5 条相关帖子，输出到：

`openspec/changes/connect-tikhub-mcp-platform-provider/acceptance/twitter-ai-product-posts.md`

Markdown 应包含采集时间、TikHub 平台 slug、工具名摘要、每条帖子文本、链接/ID、作者、发布时间、点赞数、评论数、转发数、浏览数或缺失说明，以及 Provider trace 摘要。

## Risks / Trade-offs

- TikHub 工具名或 schema 变化 -> 通过 `tools/list` 动态发现并用映射表测试关键工具。
- TikHub 额度不足或 API key 无效 -> 返回 `quota_exceeded` / `missing_api_key` / `provider_unavailable`，并触发 Codex 候选深研。
- MCP session 过期 -> 重新 initialize 一次并重试当前工具调用。
- 不同平台返回字段差异很大 -> 统一 Evidence 结构只要求核心字段，平台特有字段放入 raw metadata。
- Codex 补盲可能引入推断 -> 强制区分 `complete_observed_case` 和 `candidate_lead`，营养综合时标明来源层级。
- 平台 Cookie 参数类工具有隐私风险 -> 第一版不开放需要用户平台 Cookie 的工具。

## Migration Plan

1. 更新顶层文档，说明除小红书外的平台数据通过 TikHub MCP Provider 进入证据层。
2. 增加 TikHub MCP 配置和 `.env.example` 占位。
3. 实现 MCP Streamable HTTP client、session 管理和工具调用封装。
4. 实现非小红书社媒平台 registry、alias、能力矩阵、工具发现和安全过滤。
5. 实现 Twitter/X 工具映射、结果解析和统一归一化，作为首个强验收平台。
6. 调整 Provider Router：非小红书平台优先 TikHub MCP，不足时进入 Codex。
7. 移除或断开旧默认搜索 API Provider 与 OpenClaw 默认链路。
8. 增加单元测试、集成测试和 Twitter/X 验收 Markdown。

Rollback 策略：通过配置关闭 TikHub MCP Provider，非小红书平台请求回退到 Codex external research 的候选线索/深研模式，结果不得标记为平台实采数据。

## Open Questions

- 除 Twitter/X 外，哪些平台需要在下一批增加专属验收样例：Bilibili、Douyin、YouTube、Instagram，还是按用户任务频率排序？
- TikHub 工具调用是否需要做全局速率限制，还是先依赖供应商限流？
- 是否需要在营养工作台前端展示“TikHub 实采”和“Codex 深研补充”的来源标签？
