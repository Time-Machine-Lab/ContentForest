## ADDED Requirements

### Requirement: 非小红书平台研究必须支持 TikHub MCP Provider
系统 SHALL 提供 TikHub MCP Provider，用于在联网研究模块中采集 TikHub 支持的非小红书社交平台搜索结果、帖子详情和互动数据。Provider MUST 通过统一 Provider Router 接入，MUST 默认注册 TikTok、Douyin、Instagram、Weibo、Bilibili、YouTube、Kuaishou、Zhihu、LinkedIn、Reddit、WeChat、Twitter/X、Threads 等平台，MUST NOT 将 TikHub API key、Authorization header 或 MCP session id 暴露给 Agent。

#### Scenario: 注册非小红书社媒平台
- **WHEN** 系统启动 TikHub MCP Provider
- **THEN** 系统 MUST 建立非小红书社媒平台注册表和平台别名映射
- **AND** 系统 MUST 默认排除 Xiaohongshu/XHS/Rednote
- **AND** 系统 SHOULD 将 `Others` 和 `TikHub Utilities` 作为辅助命名空间而非默认帖子证据来源

#### Scenario: 路由 Twitter 研究请求
- **WHEN** 营养汲取 Agent 请求研究 Twitter/X 平台上的 AI 产品相关帖子
- **THEN** 系统 MUST 通过 Provider Router 选择 TikHub MCP Provider
- **AND** 系统 MUST 将目标平台映射到 TikHub `twitter` MCP server

#### Scenario: 路由其他非小红书社媒请求
- **WHEN** 营养汲取 Agent 请求研究 TikTok、Douyin、Instagram、Weibo、Bilibili、YouTube、Kuaishou、Zhihu、LinkedIn、Reddit、WeChat 或 Threads 平台内容
- **THEN** 系统 MUST 通过 Provider Router 选择 TikHub MCP Provider
- **AND** 系统 MUST 将目标平台映射到对应 TikHub MCP server 或返回结构化平台能力不足状态

#### Scenario: 排除小红书平台
- **WHEN** 用户请求研究小红书平台内容
- **THEN** TikHub MCP Provider MUST 默认拒绝处理该请求
- **AND** 系统 MUST 将小红书请求交给小红书专用 Provider 或返回明确不可用状态

### Requirement: TikHub MCP Provider 必须使用受控 MCP 会话调用工具
系统 SHALL 在 Provider 内部封装 MCP initialize、tools/list 和 tools/call。Provider MUST 使用 Streamable HTTP 传输，MUST 保存并复用当前 MCP session id，MUST 在 session 失效时重新初始化一次。

#### Scenario: 初始化 TikHub MCP server
- **WHEN** TikHub MCP Provider 首次调用某个平台
- **THEN** 系统 MUST 发送 MCP initialize 请求
- **AND** 系统 MUST 保存返回的 MCP session id 用于后续工具调用

#### Scenario: MCP session 失效
- **WHEN** TikHub MCP server 返回 session 缺失、过期或无效
- **THEN** 系统 MUST 重新 initialize 一次
- **AND** 系统 MUST 只重试当前工具调用一次以避免无限循环

### Requirement: TikHub 平台结果必须归一化为平台证据
系统 SHALL 将 TikHub 工具返回结果归一化为统一研究结果。平台结果 MUST 尽量表达平台、帖子 ID 或链接、标题或正文文本、作者、发布时间、点赞数、评论数或回复数、分享数或转发数、收藏数、浏览数、raw metadata 和采集时间；无法获取的字段 MUST 保持缺失，MUST NOT 伪造。Twitter/X 结果 MUST 额外尽量表达 tweet id、author handle、retweets/reposts 和 quotes。

#### Scenario: 归一化 Twitter 帖子详情
- **WHEN** TikHub MCP 成功返回 Twitter/X 帖子详情
- **THEN** 系统 MUST 将正文、作者、链接和互动数据映射为统一研究结果
- **AND** 系统 MUST 标记 Provider 名称、平台和采集时间

#### Scenario: 归一化其他平台帖子详情
- **WHEN** TikHub MCP 成功返回非 Twitter 的社媒帖子详情
- **THEN** 系统 MUST 将可获得的正文或标题、作者、链接和互动数据映射为统一研究结果
- **AND** 系统 MUST 将平台特有字段保留在 raw metadata 中

#### Scenario: 平台互动字段缺失
- **WHEN** TikHub MCP 返回的结果缺少浏览数或其他互动指标
- **THEN** 系统 MUST 保留已获得的互动数据
- **AND** 系统 MUST NOT 使用模型或规则猜测缺失指标

### Requirement: TikHub Provider 必须保护鉴权和平台账号态边界
系统 SHALL 从后端配置读取 TikHub API key，并在日志、Trace、错误消息和 Agent 可见上下文中脱敏。第一版 TikHub Provider MUST NOT 调用要求用户平台 Cookie、账号私域权限或写操作权限的工具。

#### Scenario: TikHub API key 缺失
- **WHEN** TikHub MCP Provider 被选中但 API key 未配置
- **THEN** 系统 MUST 返回 `missing_api_key` 或等价结构化失败
- **AND** 系统 MUST 允许 coverage gate 决定是否启用 Codex external research

#### Scenario: 工具需要平台 Cookie
- **WHEN** TikHub MCP 工具 schema 要求平台 Cookie 或账号态参数
- **THEN** 系统 MUST 默认跳过该工具
- **AND** 系统 MUST NOT 要求 Agent 或用户在研究请求中提供平台 Cookie

### Requirement: TikHub 验收必须输出 Twitter Markdown 证据样例
系统 SHALL 在本变更验收时生成 Twitter/X 采集 Markdown 样例，文件路径 MUST 为 `openspec/changes/connect-tikhub-mcp-platform-provider/acceptance/twitter-ai-product-posts.md`。

#### Scenario: 生成 Twitter 验收样例
- **WHEN** 实现完成并运行验收任务
- **THEN** 系统 MUST 使用 Twitter/X 相关关键词采集 5 条 AI 产品相关帖子
- **AND** Markdown MUST 包含每条帖子的详情、作者、发布时间、点赞数、评论数或回复数、转发数、浏览数或缺失说明
