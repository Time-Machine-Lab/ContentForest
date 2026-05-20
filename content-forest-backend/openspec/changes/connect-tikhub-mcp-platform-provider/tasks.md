## 1. 顶层文档与配置契约

- [x] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，说明除小红书外的社媒平台数据默认通过 TikHub MCP Provider 采集。
- [x] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，补充 TikHub MCP Provider、MCP client、平台工具映射、Codex coverage gate 的边界。
- [x] 1.3 更新 `docs/design/domain/营养库领域模块设计文档.md` 中多平台营养研究说明，强调 TikHub 实采证据和 Codex 深研补充的来源分层。
- [x] 1.4 检查 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql` 是否需要响应字段或存储结构变更；若无变更，在实现记录中说明本提案不新增 API 契约和 SQL 表。
- [x] 1.5 更新 `.env.example`，新增 TikHub MCP base URL、API key、默认全平台启用策略、启用平台列表、排除平台列表、超时和最大结果数配置占位。

## 2. MCP Client 与安全边界

- [x] 2.1 实现 Streamable HTTP MCP client，支持 initialize、tools/list、tools/call、session id 保存、超时和 AbortSignal。
- [x] 2.2 实现 MCP session 失效后的单次重新 initialize 和当前工具调用重试。
- [x] 2.3 实现 TikHub API key、Authorization header、MCP session id 和超长响应正文的 Trace 脱敏。
- [x] 2.4 实现工具 schema 过滤，默认跳过需要平台 Cookie、账号私域权限或写操作权限的 TikHub 工具。
- [x] 2.5 增加 TikHub MCP health/platforms 探测或配置校验，返回结构化 Provider 可用性状态和可用平台清单。

## 3. TikHub Platform Provider 实现

- [x] 3.1 实现 `TikHubMcpPlatformProvider` 并接入 `NetworkProviderRouter`。
- [x] 3.2 实现 TikHub 非小红书社媒平台注册表和平台别名映射，默认包含 TikTok、Douyin、Instagram、Weibo、Bilibili、YouTube、Kuaishou、Zhihu、LinkedIn、Reddit、WeChat、Twitter/X、Threads，并默认排除 Xiaohongshu/XHS/Rednote。
- [x] 3.3 实现平台能力矩阵，声明每个平台的搜索、详情补全、作者信息、评论、互动指标和 raw metadata 能力；`Others` 和 `TikHub Utilities` 仅在有明确公开内容工具时作为辅助命名空间启用。
- [x] 3.4 实现通用 TikHub 搜索/详情工具发现规则，将用户自然语言请求清洗为平台关键词，并按平台能力选择安全可用工具。
- [x] 3.5 实现 Twitter/X 搜索和详情工具映射，基于 tweet id 或 URL 补齐帖子详情和互动数据，作为首个强验收平台。
- [x] 3.6 将 TikHub 平台结果映射为统一研究结果，包含 platform、post id/url、text/title/content、author、createdAt、likes、comments/replies、shares/retweets、quotes、views、raw metadata 和采集时间；Twitter/X 专属字段包含 tweet id、handle、retweets/reposts、quotes。
- [x] 3.7 对 TikHub 返回的空结果、额度不足、鉴权失败、工具不可用、平台不支持、平台能力不足和网络错误进行结构化错误映射。

## 4. 路由、质量门控与 Codex 深研

- [x] 4.1 调整 Provider Router，使非小红书社媒平台请求优先进入 TikHub MCP Provider。
- [x] 4.2 实现 TikHub 结果的 `candidate_lead`、`observed_case`、`complete_observed_case` 质量分层。
- [x] 4.3 实现覆盖率和质量门控，记录目标数量、完整案例数量、TikHub 受限状态和 Codex 是否触发。
- [x] 4.4 保留 Codex external research 作为平台未知、TikHub 覆盖不足、结果不够或用户要求全网深研时的补盲层。
- [x] 4.5 从默认营养研究链路移除 OpenClaw Provider 和旧搜索 API / PublicWebSearch / BrowserResearch / placeholder Provider 注册。
- [x] 4.6 更新营养研究 Skill prompt/context，要求区分 TikHub 实采平台证据、Codex 候选线索和 Codex 综合分析。

## 5. 测试与验收

- [x] 5.1 增加 MCP client 单元测试，覆盖 initialize、session id、tools/list、tools/call、session 失效重试和错误映射。
- [x] 5.2 增加 TikHub Provider 单元测试，覆盖全平台注册表、别名映射、能力矩阵、工具选择、结果解析、字段归一化和小红书排除规则。
- [x] 5.3 增加 Provider Router 测试，确认 TikTok/Douyin/Instagram/Weibo/Bilibili/YouTube/Kuaishou/Zhihu/LinkedIn/Reddit/WeChat/Twitter/Threads 等非小红书请求优先进入 TikHub MCP，结果不足或需求宽泛时才触发 Codex deep research。
- [x] 5.4 增加营养研究 Skill 测试，确认 TikHub 实采证据、Codex 深研补充和受限状态在输出中被正确区分。
- [x] 5.5 运行 `npm run typecheck`、`npm run lint`、`npm test` 和 `openspec validate connect-tikhub-mcp-platform-provider --strict`。
- [x] 5.6 使用 TikHub MCP 执行 Twitter/X 验收采集，生成 `openspec/changes/connect-tikhub-mcp-platform-provider/acceptance/twitter-ai-product-posts.md`，包含 5 条 AI 产品相关 Twitter/X 帖子的详情和帖子数据。
