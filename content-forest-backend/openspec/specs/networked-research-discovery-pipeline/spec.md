## Purpose

Defines the two-layer networked research discovery pipeline, covering replaceable search providers, controlled browser exploration strategies, observed-case normalization, and traceable failure handling.
## Requirements
### Requirement: 联网研究必须支持双层发现管线
系统 SHALL 将联网研究组织为“初步搜索层”和“深入探索层”两层管线。初步搜索层负责通过搜索 API 或平台数据源发现候选线索；深入探索层负责在明确平台或候选链接后通过 Browser Action 执行站内搜索、页面打开、结果读取和详情观察。系统 MUST NOT 默认依赖搜索引擎网页 UI 作为唯一搜索入口。

#### Scenario: 先执行初步搜索
- **WHEN** 营养汲取 Agent 发起普通平台案例研究请求
- **THEN** 系统 MUST 优先尝试通过已配置的初步搜索 Provider 获取候选线索
- **AND** 系统 MUST 将候选线索标记为未观察结果

#### Scenario: 进入深入探索
- **WHEN** 初步搜索结果不足、用户明确要求深入查看、或目标平台策略要求站内探索
- **THEN** 系统 MUST 进入深入探索层
- **AND** 系统 MUST 通过 Browser Action 访问目标平台或候选链接

#### Scenario: 没有可用搜索 Provider
- **WHEN** 初步搜索层没有任何可用 Provider
- **THEN** 系统 MUST 返回明确的 Provider 不可用原因
- **AND** 系统 MAY 在平台策略允许时继续尝试深入探索层

### Requirement: 初步搜索层必须通过可替换 Search Provider 执行
系统 SHALL 提供 Search Provider 抽象，用于接入 Brave、Tavily、SerpApi 或其他真实搜索 API。Search Provider MUST 返回候选线索集合，且 MUST 与 Browser Action 解耦。系统 MUST NOT 把搜索引擎验证码页、搜索首页快照或登录页当作候选线索。

#### Scenario: 使用搜索 API 返回候选线索
- **WHEN** 已配置的 Search Provider 成功返回搜索结果
- **THEN** 系统 MUST 将结果归一化为候选线索
- **AND** 候选线索 MUST 包含来源、标题、链接或摘要中至少一种可追溯信息

#### Scenario: 搜索 Provider 调用失败
- **WHEN** Search Provider 因 Key 缺失、网络错误、额度不足或供应商错误而失败
- **THEN** 系统 MUST 记录 Provider 名称和失败原因
- **AND** 系统 MUST 尝试其他可用 Provider 或返回结构化失败状态

### Requirement: 深入探索层必须使用平台浏览策略
系统 SHALL 提供 Platform Browser Strategy 抽象，用于定义不同平台的浏览探索规则。平台策略 MUST 至少表达平台入口、站内搜索方式、搜索结果读取、详情页读取和受限状态识别。Browser Action Runtime MUST 只负责执行受控浏览器动作，不应硬编码某个平台的业务策略。

#### Scenario: 通过平台策略执行站内搜索
- **WHEN** 深入探索层针对某个明确平台执行研究
- **THEN** 系统 MUST 选择该平台对应的 Browser Strategy
- **AND** 系统 MUST 按策略打开平台入口并执行站内搜索或候选链接观察

#### Scenario: 平台策略不存在
- **WHEN** 目标平台没有可用 Browser Strategy
- **THEN** 系统 MUST 返回平台策略不可用状态
- **AND** 系统 MUST NOT 使用不相关平台策略强行探索

### Requirement: 小红书探索必须优先访问小红书站点
系统 SHALL 为小红书提供第一版平台探索策略。当目标平台被识别为小红书且需要深入探索时，系统 MUST 优先访问小红书站点或小红书候选链接，而不是默认打开 Bing、Google 或其他搜索引擎网页。

#### Scenario: 小红书站内搜索
- **WHEN** 用户请求研究小红书上的 AI 产品爆款案例且需要深入探索
- **THEN** 系统 MUST 打开小红书站点或小红书搜索入口
- **AND** 系统 MUST 尝试使用站内搜索能力查找相关内容

#### Scenario: 小红书访问受限
- **WHEN** 小红书页面要求登录、触发验证或无法读取结果
- **THEN** 系统 MUST 返回小红书访问受限状态
- **AND** 系统 MUST NOT 编造小红书案例或把受限页面当作案例

### Requirement: 查询规划必须区分关键词和任务指令
系统 SHALL 在联网研究前清洗用户自然语言请求。Query Planner MUST 保留平台、内容对象、题材、人群、内容形式和案例意图，MUST 去除“找几篇”“保留案例”“梳理核心”“给我 5 到 10 篇”等不适合作为搜索关键词的任务指令。

#### Scenario: 清洗案例研究请求
- **WHEN** 用户输入“找几篇小红书AI产品相关的爆款文章案例 5~10篇，保留案例，并梳理出爆款核心”
- **THEN** Query Planner MUST 生成围绕“小红书、AI产品、爆款案例、文章、种草或安利”等语义的搜索关键词
- **AND** Query Planner MUST NOT 将“找几篇”“保留案例”“梳理出核心”作为主要搜索关键词

#### Scenario: 输出平台站内关键词
- **WHEN** 目标平台需要 Browser Action 深入探索
- **THEN** Query Planner MUST 提供适合平台站内搜索的关键词
- **AND** 站内关键词 SHOULD 比通用搜索关键词更短且更贴近平台用户表达

### Requirement: 联网研究结果必须区分候选线索和已观察案例
系统 SHALL 对联网研究结果进行来源质量分层。初步搜索层返回的结果 MUST 标记为候选线索；Browser Action 打开并读取页面后返回的结果 MUST 标记为已观察案例；如果读取到标题、链接、正文摘要和可见互动数据，系统 MAY 将其标记为更完整的已观察案例。Agent MUST 能从上下文中区分这些层级。

#### Scenario: 搜索结果作为候选线索
- **WHEN** Search Provider 返回一组搜索结果
- **THEN** 系统 MUST 将其标记为候选线索
- **AND** 系统 MUST NOT 声明该结果已经被平台页面观察验证

#### Scenario: 浏览器读取后升级为已观察案例
- **WHEN** Browser Action 成功打开候选链接并读取到可用页面内容
- **THEN** 系统 MUST 将该结果标记为已观察案例
- **AND** 系统 MUST 记录观察来源和采集时间

### Requirement: 受限页面必须结构化返回
系统 SHALL 识别验证码、登录墙、访问频率限制、空结果、布局变化、超时和 Provider 不可用等受限或失败状态。受限页面 MUST 作为结构化状态返回，MUST NOT 被归一化为有效研究结果。

#### Scenario: 识别验证码页面
- **WHEN** 浏览器快照包含“请验证您是真人”、Cloudflare 安全质询、captcha 或同义验证信号
- **THEN** 系统 MUST 将结果标记为验证码受限
- **AND** 系统 MUST NOT 将该页面传递为有效案例

#### Scenario: 识别登录墙
- **WHEN** 平台要求登录后查看内容或阻止未登录访问
- **THEN** 系统 MUST 将结果标记为登录受限
- **AND** 系统 MUST 返回可理解的限制原因

#### Scenario: 识别布局变化
- **WHEN** 平台页面可访问但策略无法找到预期搜索框、结果卡片或详情内容
- **THEN** 系统 MUST 将结果标记为布局变化或策略失效
- **AND** 系统 MUST 保留必要的脱敏诊断摘要

### Requirement: 深入探索必须受控执行
系统 SHALL 对 Browser Action 设置域名白名单、最大步骤数、超时时间、最大返回正文长度和并发限制。深入探索 MUST 使用任务级 session，MUST NOT 让多个研究任务共享默认浏览器 session。

#### Scenario: 限制浏览器访问域名
- **WHEN** Browser Action 请求访问未授权域名
- **THEN** 系统 MUST 拒绝该访问
- **AND** 系统 MUST 返回域名未授权原因

#### Scenario: 限制浏览器步骤
- **WHEN** 深入探索达到最大步骤数或超时时间
- **THEN** 系统 MUST 停止继续执行浏览器动作
- **AND** 系统 MUST 返回当前已采集结果和限制触发原因

### Requirement: 联网研究 Trace 必须表达双层执行过程
系统 SHALL 为联网研究记录可诊断 Trace。Trace MUST 表达查询规划、初步搜索 Provider、深入探索触发原因、平台策略选择、Browser Action 步骤摘要、结果分层、受限状态和降级路径。Trace MUST NOT 泄露 API Key、登录 Cookie、本地绝对路径或超长页面原文。

#### Scenario: 记录初步搜索 Trace
- **WHEN** 初步搜索层完成执行
- **THEN** Trace MUST 包含使用的 Search Provider、查询词数量、候选线索数量和失败原因摘要

#### Scenario: 记录深入探索 Trace
- **WHEN** 深入探索层完成执行
- **THEN** Trace MUST 包含平台策略名称、执行步骤摘要、观察案例数量和受限状态摘要

### Requirement: 顶层文档必须同步双层联网研究架构
系统 SHALL 在实现双层联网研究能力前同步更新顶层设计文档。第二期开发规划 MUST 描述初步搜索和深入探索的关系；Agent 架构设计 MUST 描述联网研究 Tool、Provider Router、Search Provider、Browser Action 和 Platform Browser Strategy 的边界；如涉及 API 响应变化，系统 MUST 更新对应 `docs/api` 契约。

#### Scenario: 更新第二期开发规划
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/内容森林第二期开发规划文档.md`
- **AND** 文档 MUST 说明营养库活化如何使用双层联网研究能力

#### Scenario: 更新 Agent 架构设计
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/design/内容森林Agent架构设计文档.md`
- **AND** 文档 MUST 说明 Browser Action 是深入探索工具而非默认搜索入口

### Requirement: 联网研究发现管线必须支持外部 Agent 委托模式
系统 SHALL 支持外部 Agent 委托研究模式。该模式下，系统 MUST 将用户研究请求、目标平台、期望结果数量和输出契约组装为研究指令，并将搜索、浏览、资料判断和初步总结交给外部 Agent 完成。

#### Scenario: 生成外部 Agent 研究指令
- **WHEN** 用户请求研究某个平台的内容案例、趋势或表达规律
- **THEN** 系统 MUST 生成清晰的外部 Agent 研究指令
- **AND** 指令 MUST 要求外部 Agent 区分真实来源、经验总结、限制状态和可沉淀营养建议

#### Scenario: 外部 Agent 自主执行搜索和浏览
- **WHEN** Codex 外部 Agent Provider 接收到研究指令
- **THEN** ContentForest MUST NOT 规定具体搜索引擎、浏览器步骤或平台 DOM 读取逻辑
- **AND** 外部 Agent MAY 自主使用其具备的联网搜索或浏览能力完成研究

### Requirement: 外部 Agent 委托模式必须替代默认双层搜索浏览流程
系统 SHALL 将“初步搜索 + 深入探索”的双层流程作为可替换实现细节保留，但默认联网研究 MUST 使用外部 Agent 委托模式。系统 MUST NOT 在默认营养研究中强制执行本地 Query Planner 搜索词拆分、搜索 Provider 调用和 Browser Action 平台策略。

#### Scenario: 默认委托研究
- **WHEN** 营养研究任务请求联网资料
- **THEN** 系统 MUST 通过外部 Agent 委托模式获取研究资料
- **AND** 系统 MUST NOT 默认启动本地 Browser Action 深入探索

#### Scenario: 旧双层流程作为非默认能力
- **WHEN** 开发者显式启用旧双层搜索浏览 Provider
- **THEN** 系统 MAY 继续使用初步搜索和深入探索流程
- **AND** Trace MUST 明确该流程是显式启用的降级或调试路径

### Requirement: 外部 Agent 研究指令必须约束不可编造结果
系统 SHALL 在外部 Agent 研究指令中明确要求不得编造真实平台案例、链接、互动数据或来源。系统 MUST 要求外部 Agent 将“未找到”“访问受限”“只能给出经验总结”等情况作为结构化限制状态返回。

#### Scenario: 找不到真实案例
- **WHEN** 外部 Agent 无法找到满足条件的真实案例或来源链接
- **THEN** 外部 Agent 输出契约 MUST 允许返回空案例列表和限制说明
- **AND** 系统 MUST 将该状态交付给营养研究 Skill
- **AND** 系统 MUST NOT 自动补写虚构案例

#### Scenario: 平台访问受限
- **WHEN** 外部 Agent 遇到登录墙、验证码、IP 风控或平台访问限制
- **THEN** 外部 Agent 输出契约 MUST 允许返回受限状态和诊断摘要
- **AND** 系统 MUST 将其记录为 Provider 限制而不是有效研究结果

### Requirement: 外部 Agent 委托研究必须兼容营养研究会话
系统 SHALL 保持营养研究会话的用户体验不变。用户在营养工作台中发起研究对话时，系统 MUST 仍返回普通 Agent 回复和可沉淀营养块；外部 Agent Provider 的存在 MUST 对前端会话模型透明。

#### Scenario: 营养研究会话使用外部 Agent 结果
- **WHEN** 用户在营养研究会话中提交研究问题
- **THEN** 后端 MUST 通过联网研究 Tool 获取外部 Agent 研究上下文
- **AND** 营养研究 Skill MUST 基于该上下文生成普通回复和可沉淀营养块

#### Scenario: 外部 Agent 研究失败
- **WHEN** 外部 Agent Provider 调用失败或返回不可用状态
- **THEN** 营养研究会话 MUST 保存可理解的失败回复
- **AND** 系统 MUST NOT 保存虚假的可沉淀营养块

### Requirement: 顶层文档必须同步外部 Agent 委托研究架构
系统 SHALL 在实现 Codex 外部 Agent Provider 时同步更新顶层设计文档。第二期开发规划 MUST 描述营养库活化如何委托外部 Agent 研究；Agent 架构设计 MUST 描述联网研究 Tool、Provider Router、Codex 外部 Agent Provider 和旧搜索浏览 Provider 的边界。

#### Scenario: 更新第二期开发规划
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/内容森林第二期开发规划文档.md`
- **AND** 文档 MUST 说明当前默认不自研复杂搜索与浏览器操作

#### Scenario: 更新 Agent 架构设计
- **WHEN** 本变更进入实现阶段
- **THEN** 任务清单 MUST 要求更新 `docs/design/内容森林Agent架构设计文档.md`
- **AND** 文档 MUST 说明 Codex 外部 Agent Provider 是当前默认联网研究实现

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

