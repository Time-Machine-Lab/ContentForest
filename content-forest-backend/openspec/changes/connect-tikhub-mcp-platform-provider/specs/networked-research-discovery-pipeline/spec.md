## ADDED Requirements

### Requirement: 非小红书平台必须通过平台 MCP 证据管线采集
系统 SHALL 将非小红书平台型营养研究组织为“目标规划、平台路由、MCP 候选发现、MCP 详情补全、覆盖率和质量门控、营养综合”的证据管线。系统 MUST 优先使用 TikHub MCP 获取平台原生数据，MUST NOT 仅依赖通用网页搜索生成平台事实。

#### Scenario: 执行 Twitter 平台证据管线
- **WHEN** 用户请求收集 Twitter/X AI 产品相关帖子
- **THEN** 系统 MUST 识别目标平台为 Twitter/X
- **AND** 系统 MUST 通过 TikHub MCP 发现并读取帖子数据

#### Scenario: 平台未启用
- **WHEN** 用户请求的平台不在 TikHub 启用平台列表中
- **THEN** 系统 MUST 返回平台 Provider 不可用或进入 Codex 候选深研
- **AND** 系统 MUST NOT 使用错误的平台 MCP server 强行采集

### Requirement: TikHub 工具映射必须由平台和意图决定
系统 SHALL 根据目标平台、研究意图和工具 schema 选择 TikHub MCP 工具。Provider MUST 使用显式工具映射表或受控发现规则，MUST NOT 让 Agent 自由选择任意 TikHub MCP 工具。

#### Scenario: 选择 Twitter 搜索工具
- **WHEN** 研究意图为 Twitter/X 关键词搜索
- **THEN** 系统 MUST 选择 Twitter/X 搜索类 MCP 工具
- **AND** 系统 MUST 将用户自然语言请求清洗为适合平台搜索的关键词

#### Scenario: 选择 Twitter 详情工具
- **WHEN** 搜索结果提供 tweet id 或可读取链接
- **THEN** 系统 MUST 优先调用 Twitter/X 详情类 MCP 工具补全帖子数据
- **AND** 系统 MUST 将详情补全失败记录为受限状态或 Provider failure

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
系统 SHALL 为 TikHub MCP 证据管线记录可诊断 Trace。Trace MUST 表达目标平台、MCP endpoint、工具名称、候选数量、详情补全数量、完整案例数量、受限状态、Codex 是否触发和最终质量摘要，MUST NOT 泄露 API key、Authorization header、MCP session id 或超长平台正文。

#### Scenario: 记录成功 MCP 采集 Trace
- **WHEN** TikHub MCP 证据管线成功完成
- **THEN** Trace MUST 包含平台 slug、工具名摘要、候选数量和详情补全数量
- **AND** Trace MUST 能说明是否触发 Codex 深研

#### Scenario: 记录 MCP 失败 Trace
- **WHEN** TikHub MCP 因鉴权、额度、网络、session 或工具错误失败
- **THEN** Trace MUST 包含脱敏失败原因
- **AND** Trace MUST NOT 包含 TikHub API key、Authorization header 或 MCP session id

## REMOVED Requirements

### Requirement: 非小红书平台研究必须默认依赖通用搜索 API 候选线索
**Reason**: 通用搜索 API 返回的是候选网页，不足以满足 Twitter/X 等平台帖子详情和互动数据采集验收。
**Migration**: 非小红书平台研究先走 TikHub MCP 搜索和详情补全；通用搜索 Provider 从默认链路移除。

### Requirement: 非小红书平台研究必须默认使用 Browser Action 深入探索
**Reason**: 多平台 DOM 和登录态维护成本高，默认浏览器探索不适合作为平台事实采集路径。
**Migration**: 非小红书平台默认迁移到 TikHub MCP Provider；Browser Action 仅可作为未来显式调试或人工验证能力。
