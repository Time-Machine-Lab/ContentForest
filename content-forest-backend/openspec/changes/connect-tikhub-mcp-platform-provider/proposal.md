## Why

用户的营养研究需求不只发生在小红书，还会覆盖 Twitter/X、B 站、抖音、TikTok、YouTube、Instagram 等多个平台；普通搜索 API 只能给候选网页，无法稳定提供平台原生帖子详情和互动数据。TikHub MCP 提供多平台工具入口，适合作为内容森林“除小红书外”的平台数据层，Codex external research 则保留为平台覆盖不足时的广域深研能力。

本提案参考 `docs/内容森林第二期开发规划文档.md` 的“平台资料收集、规律总结、案例整理”目标、`docs/design/内容森林Agent架构设计文档.md` 的 Provider Router/受控 Tool 边界，以及现有 `networked-research-module` 对 Trace、受限状态和结果归一化的要求。

## What Changes

- 新增 TikHub MCP 平台 Provider，用于通过 hosted MCP 获取 Twitter/X 等非小红书平台的搜索结果、帖子详情和互动数据。
- 默认采用 Streamable HTTP MCP 传输，后端保存 MCP session id 并通过受控 Provider 封装 `initialize`、`tools/list`、`tools/call`。
- TikHub Provider 默认排除 Xiaohongshu slug；小红书由独立 xiaohongshu-cli 提案负责。
- 优化平台路由：明确识别 Twitter/X、Douyin、TikTok、Bilibili、YouTube、Instagram 等目标平台，并映射到 TikHub 对应 MCP server。
- 保留 Codex external research 作为 coverage gate 后的深研/补盲层，用于平台未知、API 覆盖不足、结果不够、或用户要求全网调研/趋势/竞品分析的场景。
- 删除 OpenClaw Provider 在默认链路中的角色；旧 Brave/Tavily/SerpApi/PublicWebSearch/XCrawl 类接口不再参与默认营养研究链路。
- 验收时在本提案目录下生成 `acceptance/twitter-ai-product-posts.md`，包含 Twitter/X AI 产品相关帖子的帖子详情和帖子数据。

## Capabilities

### New Capabilities

<!-- None. This change adds a platform provider inside the existing networked research capability. -->

### Modified Capabilities

- `networked-research-module`: 增加 TikHub MCP Provider、MCP 鉴权/会话/工具调用封装、非小红书平台数据归一化和受限状态表达。
- `networked-research-discovery-pipeline`: 将非小红书平台搜索从通用搜索 API 候选线索升级为平台 API/MCP 详情采集，并加入覆盖率门控与 Codex 深研触发。
- `nutrient-research-agent`: 要求营养研究 Skill 区分 TikHub 实采平台证据、Codex 候选线索和 Codex 综合分析，避免把深研推断当作平台原始数据。

## Impact

- 后端 Agent 联网研究模块：新增 MCP client/transport 封装、TikHub 平台工具映射、结果解析、错误映射和 Trace 脱敏。
- 后端配置：新增 TikHub MCP base URL、API key、启用平台列表、排除平台列表、超时和最大结果数配置；不新增数据库表。
- Provider Router：非小红书平台请求优先进入 TikHub MCP；结果不足或需求宽泛时再启用 Codex external research。
- 安全边界：TikHub API key、MCP session id、Authorization header 不进入 Agent 可见上下文；平台 Cookie 参数类工具默认不开放。
- 文档：更新 `docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林Agent架构设计文档.md`、`.env.example`；如 API 响应契约变化，再同步 `docs/api/nutrient.yaml`。
- 验收产物：实现完成后在 `openspec/changes/connect-tikhub-mcp-platform-provider/acceptance/` 下输出 Twitter/X 采集 Markdown 样例。
