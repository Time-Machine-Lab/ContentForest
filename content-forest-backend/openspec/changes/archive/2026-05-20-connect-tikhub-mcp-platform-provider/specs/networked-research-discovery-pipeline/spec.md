## ADDED Requirements

### Requirement: 非小红书平台必须通过平台 MCP 证据管线采集
系统 SHALL 将非小红书平台型营养研究组织为“目标规划、平台路由、能力判断、MCP 候选发现、MCP 详情补全、覆盖率和质量门控、营养综合”的证据管线。系统 MUST 优先使用 TikHub MCP 获取平台原生数据，MUST 默认覆盖 TikHub 支持的非小红书社媒平台，MUST NOT 仅依赖通用网页搜索生成平台事实。

#### Scenario: 执行 Twitter 平台证据管线
- **WHEN** 用户请求收集 Twitter/X AI 产品相关帖子
- **THEN** 系统 MUST 识别目标平台为 Twitter/X
- **AND** 系统 MUST 通过 TikHub MCP 发现并读取帖子数据

#### Scenario: 执行其他非小红书平台证据管线
- **WHEN** 用户请求收集 TikTok、Douyin、Instagram、Weibo、Bilibili、YouTube、Kuaishou、Zhihu、LinkedIn、Reddit、WeChat 或 Threads 平台内容
- **THEN** 系统 MUST 识别目标平台并进入 TikHub MCP 证据管线
- **AND** 系统 MUST 根据平台能力矩阵决定是否执行搜索、详情补全或返回受限状态

#### Scenario: 平台未启用
- **WHEN** 用户请求的平台不在 TikHub 启用平台列表中
- **THEN** 系统 MUST 返回平台 Provider 不可用或进入 Codex 候选深研
- **AND** 系统 MUST NOT 使用错误的平台 MCP server 强行采集

### Requirement: TikHub 工具映射必须由平台和意图决定
系统 SHALL 根据目标平台、研究意图、平台能力矩阵和工具 schema 选择 TikHub MCP 工具。Provider MUST 使用显式工具映射表或受控发现规则，MUST NOT 让 Agent 自由选择任意 TikHub MCP 工具。

#### Scenario: 建立平台能力矩阵
- **WHEN** Provider 发现 TikHub 平台和工具 schema
- **THEN** 系统 MUST 为每个平台记录搜索、详情补全、评论、作者信息和互动指标等能力
- **AND** 系统 MUST 跳过需要平台 Cookie、账号私域权限或写操作权限的工具

#### Scenario: 选择 Twitter 搜索工具
- **WHEN** 研究意图为 Twitter/X 关键词搜索
- **THEN** 系统 MUST 选择 Twitter/X 搜索类 MCP 工具
- **AND** 系统 MUST 将用户自然语言请求清洗为适合平台搜索的关键词

#### Scenario: 选择其他平台搜索工具
- **WHEN** 研究意图为非小红书平台关键词搜索
- **THEN** 系统 MUST 根据目标平台选择对应平台的搜索类 MCP 工具
- **AND** 系统 MUST 在没有安全搜索工具时返回结构化能力不足状态

#### Scenario: 选择 Twitter 详情工具
- **WHEN** 搜索结果提供 tweet id 或可读取链接
- **THEN** 系统 MUST 优先调用 Twitter/X 详情类 MCP 工具补全帖子数据
- **AND** 系统 MUST 将详情补全失败记录为受限状态或 Provider failure

#### Scenario: 选择其他平台详情工具
- **WHEN** 搜索结果提供平台帖子 id 或可读取链接
- **THEN** 系统 MUST 优先调用对应平台的详情类 MCP 工具补全帖子数据
- **AND** 系统 MUST 保留平台特有字段到 raw metadata

### Requirement: 覆盖率门控必须决定是否启用 Codex 深研
系统 SHALL 在 TikHub MCP 采集后执行覆盖率和质量门控。只有当平台未知、TikHub 不支持、MCP 返回结果不足、API 受限或用户要求全网调研/竞品分析/趋势分析时，系统 MUST 启用 Codex external research。

#### Scenario: TikHub 实采结果足够
- **WHEN** TikHub MCP 返回不少于目标数量的完整已观察案例
- **THEN** 系统 MUST 直接进入营养综合
- **AND** 系统 MUST NOT 额外调用 Codex 生成平台帖子事实

#### Scenario: 用户要求全网深入研究
- **WHEN** 用户请求包含全网调研、深入研究、竞品分析、趋势或方法论总结
- **THEN** 系统 MUST 在 TikHub 平台证据之外启用 Codex external research
- **AND** Codex 输出 MUST 与 TikHub 实采平台证据分层表达

### Requirement: TikHub 证据管线 Trace 必须可诊断
系统 SHALL 为 TikHub MCP 证据管线记录可诊断 Trace。Trace MUST 表达目标平台、MCP endpoint、平台能力摘要、工具名称、候选数量、详情补全数量、完整案例数量、受限状态、Codex 是否触发和最终质量摘要，MUST NOT 泄露 API key、Authorization header、MCP session id 或超长平台正文。

#### Scenario: 记录成功 MCP 采集 Trace
- **WHEN** TikHub MCP 证据管线成功完成
- **THEN** Trace MUST 包含平台 slug、工具名摘要、候选数量和详情补全数量
- **AND** Trace MUST 能说明是否触发 Codex 深研

#### Scenario: 记录 MCP 失败 Trace
- **WHEN** TikHub MCP 因鉴权、额度、网络、session 或工具错误失败
- **THEN** Trace MUST 包含脱敏失败原因
- **AND** Trace MUST NOT 包含 TikHub API key、Authorization header 或 MCP session id
