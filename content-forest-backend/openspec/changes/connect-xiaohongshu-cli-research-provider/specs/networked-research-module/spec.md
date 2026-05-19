## ADDED Requirements

### Requirement: 小红书研究必须通过 xiaohongshu-cli Provider 进入统一联网研究模块
系统 SHALL 提供 xiaohongshu-cli Provider，用于在联网研究模块中执行小红书关键词搜索和笔记详情采集。Provider MUST 通过统一 Provider Router 接入，MUST NOT 将小红书登录态、Cookie、浏览器 Profile 路径或 CLI 私有配置暴露给 Agent。

#### Scenario: 路由小红书研究请求
- **WHEN** 营养汲取 Agent 请求研究小红书平台上的 AI 产品相关帖子
- **THEN** 系统 MUST 通过 Provider Router 选择 xiaohongshu-cli Provider
- **AND** 系统 MUST NOT 默认调用 TikHub Xiaohongshu 接口或旧通用搜索 Provider

#### Scenario: xiaohongshu-cli 不可用
- **WHEN** xiaohongshu-cli 可执行文件不存在、版本不可用或健康检查失败
- **THEN** 系统 MUST 返回结构化 Provider 不可用状态
- **AND** 系统 MUST 允许 coverage gate 决定是否启用 Codex external research 作为候选深研

### Requirement: 小红书 Provider 必须采集笔记详情和互动数据
系统 SHALL 对小红书候选笔记执行详情补全。详情结果 MUST 尽量表达笔记标题、链接或笔记 ID、作者、封面、正文、发布时间、点赞数、评论数、收藏数和采集时间；无法获取的字段 MUST 保持缺失或标记受限，MUST NOT 伪造。

#### Scenario: 采集完整笔记详情
- **WHEN** xiaohongshu-cli 成功读取一条小红书笔记详情
- **THEN** 系统 MUST 将标题、作者、封面、正文和可见互动数据映射为统一研究结果
- **AND** 系统 MUST 标记 Provider 名称和采集时间

#### Scenario: 互动数据部分缺失
- **WHEN** 小红书详情中缺少点赞数、评论数或收藏数之一
- **THEN** 系统 MUST 保留已获得的互动数据
- **AND** 系统 MUST NOT 使用模型或规则猜测缺失指标

### Requirement: 小红书实采结果必须具备证据质量分层
系统 SHALL 根据小红书采集完整度标记结果质量。只有搜索列表但未读取详情的结果 MUST 标记为候选线索；读取到可复查链接或 ID、标题、作者、正文或正文摘要，并包含至少一种互动数据的结果 MUST 标记为完整已观察案例。

#### Scenario: 搜索列表结果作为候选线索
- **WHEN** xiaohongshu-cli 只返回搜索列表候选项
- **THEN** 系统 MUST 将该结果标记为 `candidate_lead`
- **AND** 营养研究 Skill MUST NOT 将该结果描述为已验证小红书案例

#### Scenario: 详情补全结果作为完整已观察案例
- **WHEN** xiaohongshu-cli 成功读取笔记详情且结果包含可复查 ID 或链接、标题、作者、正文或正文摘要、至少一种互动数据
- **THEN** 系统 MUST 将该结果标记为 `complete_observed_case`
- **AND** 系统 MUST 将其作为可用于营养综合的实采平台证据

### Requirement: 小红书 Provider 必须表达登录和风控受限状态
系统 SHALL 识别 xiaohongshu-cli 返回的未登录、Cookie 过期、验证码、IP 限制、空结果、API 错误和超时状态。受限状态 MUST 作为结构化 failure 或 restrictedStatus 返回，MUST NOT 被归一化为有效研究结果。

#### Scenario: 小红书登录态失效
- **WHEN** xiaohongshu-cli 返回未认证、Cookie 过期或需要重新登录
- **THEN** 系统 MUST 返回 `restricted_by_login` 或等价结构化状态
- **AND** 系统 MUST NOT 在 Agent 任务中触发交互式二维码登录

#### Scenario: 小红书触发验证码或 IP 限制
- **WHEN** xiaohongshu-cli 返回验证码、NeedVerify、IP blocked 或访问受限错误
- **THEN** 系统 MUST 返回对应受限状态和脱敏诊断摘要
- **AND** 系统 MUST NOT 编造小红书帖子或互动数据

### Requirement: 小红书采集验收必须输出 Markdown 证据样例
系统 SHALL 在本变更验收时生成小红书采集 Markdown 样例，文件路径 MUST 为 `openspec/changes/connect-xiaohongshu-cli-research-provider/acceptance/xiaohongshu-ai-product-posts.md`。

#### Scenario: 生成小红书验收样例
- **WHEN** 实现完成并运行验收任务
- **THEN** 系统 MUST 使用小红书关键词采集 5 条 AI 产品相关帖子
- **AND** Markdown MUST 包含每条帖子的详情、作者、封面、正文或正文摘录、点赞数、评论数、收藏数和采集限制说明

## REMOVED Requirements

### Requirement: OpenClaw 作为小红书营养研究默认 Provider
**Reason**: 小红书平台需要确定性帖子详情和互动数据，OpenClaw 外部 Agent 委托链路不再作为小红书事实采集的默认来源。
**Migration**: 小红书请求迁移到 xiaohongshu-cli Provider；Codex external research 仅作为结果不足或深度分析时的候选补盲层。

### Requirement: 旧搜索 API 作为小红书营养研究默认 Provider
**Reason**: Brave、Tavily、SerpApi、PublicWebSearch、XCrawl 类路径只能提供候选网页或增加维护成本，不能稳定提供小红书原帖详情与互动数据。
**Migration**: 小红书默认通过 xiaohongshu-cli 执行搜索和详情补全；旧 Provider 从默认营养研究链路移除。
