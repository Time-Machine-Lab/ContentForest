## ADDED Requirements

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
