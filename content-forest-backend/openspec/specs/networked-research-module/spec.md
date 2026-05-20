## Purpose

Defines shared backend networked research capabilities for controlled provider routing, query planning, browser observation, result normalization, and downstream consumption by Agent and monitoring workflows.
## Requirements
### Requirement: 定义泛用联网数据获取 Provider 架构
系统 SHALL 提供泛用联网数据获取模块，用于为 Agent 和后续数据监控器提供受控的外部资料发现、网页读取、浏览器观察、指定链接观测和平台专项数据获取能力。联网数据获取模块 MUST 通过统一 Provider Router 调用不同来源，MUST NOT 让 Agent 或监控器直接绑定某个搜索供应商、浏览器命令或平台爬取实现。

#### Scenario: 通过 Provider Router 执行研究
- **WHEN** 营养汲取 Agent 请求执行联网研究
- **THEN** 系统 MUST 通过联网研究 Provider Router 选择可用研究来源
- **AND** 系统 MUST 返回统一格式的研究结果集合

#### Scenario: 通过 Provider Router 执行观测
- **WHEN** 数据监控器请求对指定发布链接采集当前表现数据
- **THEN** 系统 MUST 通过联网数据获取 Provider Router 选择可用观测来源
- **AND** 系统 MUST 返回统一格式的观测结果

#### Scenario: Provider 不可用时降级
- **WHEN** 某个配置的研究 Provider 不可用或调用失败
- **THEN** 系统 MUST 记录失败原因
- **AND** 系统 MUST 尝试使用其他可用 Provider 或返回可理解的不可用原因

### Requirement: 支持查询规划与多查询执行
系统 SHALL 在执行联网研究前将用户研究请求规划为多条可执行查询。查询规划 MUST 表达研究意图、目标平台、内容对象、查询词和候选 Provider，MUST 避免把种子标题无差别拼接进所有搜索词。

#### Scenario: 拆分平台研究请求
- **WHEN** 用户要求研究某个平台的爆款案例或内容打法
- **THEN** 系统 MUST 生成多条面向平台语义的查询
- **AND** 查询 MUST 尽量表达平台、内容类型、目标对象和案例意图

#### Scenario: 查询规划失败时使用兜底
- **WHEN** LLM 查询规划失败或返回不可用规划
- **THEN** 系统 MUST 使用确定性兜底查询规划
- **AND** 系统 MUST 不得直接将本次研究任务标记为无结果

### Requirement: 归一化联网研究结果
系统 SHALL 将所有 Provider 返回结果归一化为统一研究结果。归一化结果 MUST 能表达标题、链接、来源平台或域名、摘要、发布时间、抓取时间、互动数据、来源方式和原始片段摘要；无法获取的字段 MUST 以缺失状态表达，不得由系统伪造。

#### Scenario: 归一化通用搜索结果
- **WHEN** 通用搜索 Provider 返回网页结果
- **THEN** 系统 MUST 将其转换为统一研究结果
- **AND** 系统 MUST 标记结果来自通用搜索

#### Scenario: 归一化平台数据结果
- **WHEN** 平台专项 Provider 返回帖子、视频或互动数据
- **THEN** 系统 MUST 保留可获取的真实互动数据
- **AND** 系统 MUST 标记结果来源和抓取时间

### Requirement: 支持指定链接观测结果归一化
系统 SHALL 支持对指定 URL 或平台对象进行观测，并将观测结果归一化为统一结构。观测结果 MUST 表达目标链接、来源平台或域名、采集时间、可见指标、页面可访问状态、来源方式和原始片段摘要；无法获取的指标 MUST 以缺失状态表达，不得由系统伪造。

#### Scenario: 观测发布链接指标
- **WHEN** 监控器请求观测一条已发布果实的外部链接
- **THEN** 系统 MUST 返回该链接当前可采集的表现指标
- **AND** 系统 MUST 标记采集时间和来源方式

#### Scenario: 指标不可见
- **WHEN** 页面隐藏了点赞、收藏、观看或评论等指标
- **THEN** 系统 MUST 将对应指标标记为不可获取或缺失
- **AND** 系统 MUST NOT 使用模型猜测指标数值

#### Scenario: 页面不可访问
- **WHEN** 指定链接失效、需要登录、触发验证码或被平台限制访问
- **THEN** 系统 MUST 返回页面不可访问状态和可理解原因
- **AND** 系统 MUST NOT 创建虚假的观测数据

### Requirement: 支持结果去重、新鲜度和相关性排序
系统 SHALL 对联网研究结果进行去重、新鲜度标记和相关性排序。排序结果 MUST 服务于 Agent 总结上下文，MUST NOT 被解释为平台效果预测或爆款保证。

#### Scenario: 去除重复链接
- **WHEN** 多个 Provider 返回相同或等价链接
- **THEN** 系统 MUST 合并重复结果
- **AND** 系统 MUST 尽量保留更完整的摘要、互动数据和来源信息

#### Scenario: 标记资料新鲜度
- **WHEN** 研究结果包含发布时间或抓取时间
- **THEN** 系统 MUST 能表达该结果的新鲜度
- **AND** 系统 MUST 不因缺少发布时间而伪造发布时间

### Requirement: 浏览器观察必须隔离会话和限制并发
系统 SHALL 提供浏览器观察 Provider，用于真实打开网页、读取可见内容、执行有限交互和采集截图。浏览器观察 Provider MUST 为每个研究任务使用独立 session，MUST 对同一 session 内操作串行执行，并 MUST 设置全局并发上限。

#### Scenario: 为研究任务创建浏览器 session
- **WHEN** 研究任务需要使用浏览器观察
- **THEN** 系统 MUST 使用任务级 session 标识运行浏览器操作
- **AND** 系统 MUST NOT 使用共享的默认 session 承载多个研究任务

#### Scenario: 限制浏览器并发
- **WHEN** 多个研究任务同时请求浏览器观察
- **THEN** 系统 MUST 通过并发池限制同时运行的浏览器任务数量
- **AND** 超出并发限制的任务 MUST 排队或返回可理解的繁忙状态

### Requirement: 浏览器观察必须受域名、步骤和时间约束
系统 SHALL 限制浏览器观察的可访问域名、最大步骤数、最长运行时间、最大截图数和最大返回正文长度。浏览器观察 Provider MUST 不允许 Agent 任意浏览未授权域名或无限执行页面操作。

#### Scenario: 拒绝未授权域名
- **WHEN** Agent 请求浏览器访问不在允许范围内的域名
- **THEN** 系统 MUST 拒绝该请求
- **AND** 系统 MUST 返回域名未授权原因

#### Scenario: 浏览器操作超出限制
- **WHEN** 浏览器观察达到最大步骤数或超时时间
- **THEN** 系统 MUST 停止继续操作
- **AND** 系统 MUST 返回当前已采集结果和限制触发原因

### Requirement: 联网研究结果只作为营养候选资料
系统 SHALL 将联网研究结果作为 Agent 生成可沉淀营养的参考资料。Agent MAY 基于研究结果生成普通回复和可沉淀营养块，但 MUST NOT 直接写入正式营养库、公共营养库、数据库或 Markdown 内容文件。

#### Scenario: Agent 生成可沉淀营养
- **WHEN** 联网研究完成且 Agent 总结出可沉淀营养块
- **THEN** 系统 MUST 将其作为候选结果返回给营养领域
- **AND** 系统 MUST 等待用户或后端领域规则确认后才能沉淀

#### Scenario: 研究结果不自动入库
- **WHEN** Provider 返回大量网页、帖子或视频结果
- **THEN** 系统 MUST NOT 自动创建正式营养内容
- **AND** 系统 MUST NOT 自动保存结果到公共营养库

### Requirement: 联网观测结果不直接创建反馈快照
系统 SHALL 将联网观测结果作为数据回流领域可消费的外部采集结果。联网数据获取模块 MUST NOT 直接创建反馈快照、修改监控器挂载、判断内容成败或修改果实物竞天择状态。

#### Scenario: 监控器消费观测结果
- **WHEN** 数据监控器获得联网观测结果
- **THEN** 数据回流领域 MAY 基于该结果创建反馈快照
- **AND** 快照创建 MUST 遵守数据回流领域规则

#### Scenario: Provider 不写反馈事实
- **WHEN** Provider 成功采集到外部平台指标
- **THEN** Provider MUST 只返回观测结果
- **AND** Provider MUST NOT 直接写入反馈快照或数据库事实

### Requirement: 联网研究必须记录 Trace 和失败原因
系统 SHALL 为联网研究和联网观测过程记录可诊断 Trace。Trace MUST 至少表达查询规划或观测目标、Provider 选择、Provider 调用、结果数量、失败原因、降级路径和最终结果摘要，并 MUST 不记录真实 API Key、本地绝对路径、登录 Cookie 或超出配置上限的长正文。

#### Scenario: 记录成功研究 Trace
- **WHEN** 联网研究任务成功完成
- **THEN** Trace MUST 包含查询规划、Provider 调用和结果归一化摘要
- **AND** Trace MUST 能帮助开发者定位使用了哪些研究来源

#### Scenario: 记录失败研究 Trace
- **WHEN** 联网研究任务失败或部分 Provider 失败
- **THEN** Trace MUST 包含失败 Provider 和失败原因
- **AND** 系统 MUST 不泄露密钥、登录态或本地绝对路径

#### Scenario: 记录观测 Trace
- **WHEN** 联网观测任务完成或失败
- **THEN** Trace MUST 包含观测目标、Provider 调用和采集结果摘要
- **AND** Trace MUST 不泄露登录 Cookie、密钥或超长页面原文

### Requirement: 顶层 API 与 SQL 文档保持同步
系统 SHALL 在联网研究模块涉及 HTTP API 或持久化结构时同步更新顶层 API 与 SQL 文档。营养汲取相关接口 MUST 落到 `docs/api/nutrient.yaml` 对应的 nutrient Controller；Agent 运行时管理接口如需新增 MUST 落到单独的 Agent API 文档；新增表结构 MUST 落到对应 `.sql` 文件。

#### Scenario: 新增营养研究 API
- **WHEN** 实现联网研究驱动的营养汲取接口
- **THEN** 系统 MUST 更新 `docs/api/nutrient.yaml`
- **AND** 该接口 MUST 归属于 nutrient Controller 契约

#### Scenario: 新增数据监控观测 API
- **WHEN** 实现监控器触发联网观测或查看观测结果的接口
- **THEN** 系统 MUST 更新 `docs/api/feedback.yaml`
- **AND** 该接口 MUST 归属于 Feedback Controller 契约

#### Scenario: 新增研究持久化结构
- **WHEN** 实现需要保存研究任务、研究结果或 Provider 调用记录的表
- **THEN** 系统 MUST 更新对应 SQL 文档
- **AND** 一张表 MUST 对应一个清晰归属的 SQL 文档

### Requirement: 支持 Codex 外部 Agent 委托研究 Provider
系统 SHALL 提供 Codex 外部 Agent 委托研究 Provider，用于将联网研究任务交给外部 Codex Provider 执行。该 Provider MUST 通过 Responses 兼容接口调用外部 Agent，并 MUST 将外部 Agent 返回的结构化研究结果归一化为联网研究上下文包。

#### Scenario: 调用 Codex 外部 Agent 执行研究
- **WHEN** 营养研究 Skill 请求补充外部平台资料
- **THEN** 系统 MUST 通过 Codex 外部 Agent Provider 调用配置的 Responses 接口
- **AND** 请求 MUST 包含研究指令、模型、推理强度和联网搜索工具配置
- **AND** 系统 MUST 将返回结果转换为统一联网研究结果

#### Scenario: Codex Provider 未配置
- **WHEN** Codex 外部 Agent Provider 未配置 base URL、API Key 或模型
- **THEN** 系统 MUST 返回 Provider 不可用原因
- **AND** 系统 MUST NOT 尝试调用未配置完整的外部 Provider

### Requirement: Codex 外部 Agent 配置必须来自环境变量
系统 SHALL 允许开发者通过后端本地环境变量配置 Codex 外部 Agent Provider。配置 MUST 至少包含 base URL、API Key、wire API、模型、推理强度、鉴权方式、搜索上下文大小和超时时间。

#### Scenario: 读取 Codex 外部 Agent 配置
- **WHEN** 后端启动并加载本地环境配置
- **THEN** 系统 MUST 读取 Codex 外部 Agent Provider 的配置项
- **AND** 系统 MUST 使用占位示例而不是在示例文件中保存真实密钥

#### Scenario: 鉴权信息脱敏
- **WHEN** 系统记录 Provider 配置摘要、Trace 或失败原因
- **THEN** 系统 MUST NOT 记录真实 API Key、Authorization Header 或 Bearer Token
- **AND** 系统 MAY 记录 Provider 名称、模型、wire API 和脱敏后的配置状态

### Requirement: 外部 Agent 输出必须结构化校验
系统 SHALL 要求 Codex 外部 Agent 返回结构化研究输出。系统 MUST 校验输出中可沉淀营养、候选资料、来源链接、摘要和限制说明的格式；校验失败时 MUST 返回可理解失败原因，MUST NOT 将不可解析内容当作有效研究结果。

#### Scenario: 结构化输出有效
- **WHEN** Codex 外部 Agent 返回符合契约的结构化研究结果
- **THEN** 系统 MUST 提取研究总结、候选资料和可沉淀营养建议
- **AND** 系统 MUST 将候选资料归一化为联网研究结果

#### Scenario: 结构化输出无效
- **WHEN** Codex 外部 Agent 返回非 JSON、缺少必要字段或字段类型不正确
- **THEN** 系统 MUST 将本次 Provider 调用标记为失败
- **AND** 系统 MUST NOT 伪造候选资料或可沉淀营养

### Requirement: 外部 Agent 研究结果默认作为候选线索
系统 SHALL 将 Codex 外部 Agent 返回的资料默认标记为候选线索。只有当外部 Agent 明确提供可追溯页面观察证据时，系统 MAY 将结果标记为已观察案例；系统 MUST NOT 仅凭模型总结将资料标记为完整已观察案例。

#### Scenario: 返回候选线索
- **WHEN** Codex 外部 Agent 返回带来源链接和摘要的研究资料
- **THEN** 系统 MUST 将该资料标记为候选线索
- **AND** 系统 MUST 保留来源链接和摘要以供用户判断

#### Scenario: 缺少来源链接
- **WHEN** Codex 外部 Agent 返回没有来源链接的经验性总结
- **THEN** 系统 MUST 将其作为普通研究摘要或可沉淀建议处理
- **AND** 系统 MUST NOT 将其归一化为真实案例链接

### Requirement: 联网研究默认 Provider 必须收敛到外部 Agent
系统 SHALL 将 Codex 外部 Agent Provider 作为联网研究默认入口。`ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 默认深度探索和平台专项 Provider MUST NOT 在默认配置下参与营养研究；系统 MUST 保留这些 Provider 的代码，不得在本变更中删除它们。

#### Scenario: 默认执行联网研究
- **WHEN** 后端使用默认 Provider Router 执行营养研究
- **THEN** 系统 MUST 优先使用 Codex 外部 Agent Provider
- **AND** 系统 MUST NOT 默认调用 Brave、Tavily、SerpApi、公开网页搜索或 Browser Action

#### Scenario: 保留旧 Provider 代码
- **WHEN** 实现本变更
- **THEN** 系统 MUST 保留 `ConfiguredSearchApiProvider`、`PublicWebSearchProvider`、`BrowserResearchProvider` 和平台专项 Provider 的代码
- **AND** 系统 MUST 只移除或关闭它们在默认 Provider Router 中的默认启用路径

#### Scenario: 显式启用降级 Provider
- **WHEN** 开发者通过配置显式启用其他联网研究 Provider
- **THEN** 系统 MAY 注册对应 Provider
- **AND** Trace MUST 标明实际使用的 Provider

### Requirement: Codex 外部 Agent 调用必须记录可诊断 Trace
系统 SHALL 为 Codex 外部 Agent 调用记录可诊断 Trace。Trace MUST 表达 Provider 名称、模型、wire API、是否请求 web search、结果数量、耗时、失败原因和输出校验状态，并 MUST 对密钥、超长正文和敏感内容脱敏或裁剪。

#### Scenario: 记录成功委托研究 Trace
- **WHEN** Codex 外部 Agent Provider 成功返回研究结果
- **THEN** Trace MUST 记录 Provider 名称、模型、工具使用摘要、结果数量和耗时
- **AND** Trace MUST NOT 泄露 API Key 或完整外部输出正文

#### Scenario: 记录失败委托研究 Trace
- **WHEN** Codex 外部 Agent Provider 网络失败、超时、鉴权失败或输出校验失败
- **THEN** Trace MUST 记录失败类型和可理解原因
- **AND** Trace MUST NOT 泄露真实请求头、API Key 或 Bearer Token

### Requirement: 支持 OpenClaw 外部 Agent 研究 Provider
系统 SHALL 支持将 OpenClaw 作为联网研究模块的外部 Agent Provider。OpenClaw Provider MUST 通过统一 Provider Router 接入，MUST 返回可归一化为现有联网研究结果、受限状态和失败原因的结构化结果，MUST NOT 直接写入营养库、反馈快照、数据库或 Markdown 内容文件。

#### Scenario: OpenClaw Provider 执行营养研究
- **WHEN** 营养汲取 Agent 通过联网研究 Tool 发起研究请求，且 OpenClaw Provider 已启用并配置完整
- **THEN** 系统 MUST 将研究请求、目标平台、期望结果数量和不可编造约束组装为 OpenClaw 研究指令
- **AND** 系统 MUST 将 OpenClaw 返回内容归一化为统一联网研究结果包
- **AND** 系统 MUST 标记结果来源 Provider 为 OpenClaw

#### Scenario: OpenClaw 配置缺失
- **WHEN** OpenClaw Provider 被选为主 Provider 但 Gateway URL 或鉴权 Token 缺失
- **THEN** 系统 MUST 记录 OpenClaw Provider 不可用原因
- **AND** 系统 MUST 继续尝试已配置的降级 Provider

### Requirement: OpenClaw 失败时自动降级 Codex
系统 SHALL 支持 OpenClaw 主 Provider 与 Codex 降级 Provider 的串行降级链路。当 OpenClaw 调用失败、超时、返回空结果、返回不可解析结果或被判定不可用时，系统 MUST 记录 OpenClaw 失败原因，并继续调用 Codex Provider。系统 MUST NOT 因 OpenClaw 单点失败直接终止整个联网研究任务，除非没有任何可用降级 Provider。

#### Scenario: OpenClaw 网络失败后降级 Codex
- **WHEN** OpenClaw Provider 在联网研究中返回网络错误或 Provider 错误
- **THEN** 系统 MUST 在 failures 中记录 OpenClaw 失败原因
- **AND** 系统 MUST 继续调用 Codex Provider
- **AND** 如果 Codex 返回可用结果，系统 MUST 返回 Codex 结果并保留 OpenClaw 失败 Trace

#### Scenario: OpenClaw 超时后降级 Codex
- **WHEN** OpenClaw Provider 超过配置的研究超时时间
- **THEN** 系统 MUST 终止或关闭本次 OpenClaw 调用
- **AND** 系统 MUST 尝试删除本次 OpenClaw session
- **AND** 系统 MUST 继续调用 Codex Provider

#### Scenario: 所有外部 Agent Provider 均不可用
- **WHEN** OpenClaw 和 Codex Provider 均不可用或均失败
- **THEN** 系统 MUST 返回结构化 failures
- **AND** 系统 MUST NOT 编造任何研究结果或营养候选

### Requirement: OpenClaw session 必须由系统清理
系统 SHALL 为每次 OpenClaw 研究调用使用独立 session，并在调用结束后由系统基础设施层删除该 session。session 删除 MUST 在 Provider 或 OpenClaw Client 的 finally 路径执行，MUST NOT 暴露给 Agent 作为可调用工具，MUST NOT 依赖 Agent 自行决定是否删除。

#### Scenario: OpenClaw 成功后删除 session
- **WHEN** OpenClaw Provider 成功完成一次联网研究调用
- **THEN** 系统 MUST 在返回结果前或返回结果流程的 finally 阶段请求删除本次 OpenClaw session
- **AND** 系统 MUST NOT 将删除 session 的操作交给营养研究 Agent 执行

#### Scenario: OpenClaw 失败后仍删除 session
- **WHEN** OpenClaw Provider 在研究过程中失败、超时或返回不可解析结果
- **THEN** 系统 MUST 仍然尝试删除本次 OpenClaw session
- **AND** 系统 MUST 继续执行配置的降级 Provider

#### Scenario: OpenClaw session 删除失败
- **WHEN** OpenClaw 研究调用已经完成但 session 删除失败
- **THEN** 系统 MUST 记录脱敏的 session 清理失败信息
- **AND** 如果研究结果本身可用，系统 MUST NOT 因 session 删除失败丢弃研究结果
- **AND** 系统 MUST NOT 在 Trace 中记录鉴权 Token 或敏感连接信息

### Requirement: OpenClaw 配置必须脱敏且可回退
系统 SHALL 通过环境变量配置 OpenClaw Provider，并支持通过配置回退到 Codex Provider。系统 MUST 在日志、Trace、测试输出和错误消息中隐藏 OpenClaw 鉴权 Token，MUST 支持通过配置切换回 Codex-only 链路。

#### Scenario: 使用 OpenClaw 主 Provider 和 Codex 降级 Provider
- **WHEN** 配置声明 OpenClaw 为主 Provider 且 Codex 为降级 Provider
- **THEN** 系统 MUST 按 OpenClaw 到 Codex 的顺序执行联网研究
- **AND** 系统 MUST 在 Trace 中表达 Provider 调用顺序和降级路径

#### Scenario: 切换回 Codex-only 链路
- **WHEN** 配置声明 Codex 为主 Provider 且未启用 OpenClaw
- **THEN** 系统 MUST 不创建 OpenClaw session
- **AND** 系统 MUST 继续使用现有 Codex 外部研究 Provider

#### Scenario: OpenClaw Token 不泄漏
- **WHEN** OpenClaw 调用失败或配置缺失
- **THEN** 系统 MUST 返回脱敏错误
- **AND** 系统 MUST NOT 在 failures、restrictedStatuses、Trace 或日志摘要中包含完整 OpenClaw Token

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

