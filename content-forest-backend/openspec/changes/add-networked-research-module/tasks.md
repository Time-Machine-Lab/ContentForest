## 1. 顶层契约与设计文档

- [x] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，补充联网研究模块、Research Provider Router、浏览器观察和营养汲取对接架构。
- [x] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，将泛用联网数据获取 Tool、Provider Router、浏览器观察 session 隔离和 Trace 规则纳入 Agent 工具层设计。
- [x] 1.3 更新数据回流相关顶层设计文档，说明监控器后续可复用联网观测模式采集已发布链接表现数据。
- [x] 1.4 审核 `docs/api/nutrient.yaml`，如营养汲取研究接口需要新增或调整请求/响应字段，先完成 API 契约更新。
- [x] 1.5 审核 `docs/sql/nutrient.sql` 与相关 SQL 文档，如需要持久化研究任务、研究结果或 Provider 调用记录，先完成 SQL 契约更新。
- [x] 1.6 审核 `docs/api/feedback.yaml` 和 `docs/sql/feedback.sql`，如监控器联网观测需要新增接口或存储结构，先完成反馈 API/SQL 契约更新。

## 2. 联网研究核心抽象

- [x] 2.1 新增联网数据获取模块目录，定义 Network Provider、查询规划、Provider Router、归一化结果、研究上下文包和观测结果的类型契约。
- [x] 2.2 实现 Query Planner，支持从用户研究请求中提取平台、对象、内容类型、案例数量和多条查询词。
- [x] 2.3 实现确定性兜底查询规划，避免 LLM 规划失败时直接返回无结果。
- [x] 2.4 实现 Provider Router，按配置可用性、平台意图和失败情况选择 Provider。
- [x] 2.5 实现研究结果归一化、去重、新鲜度标记和相关性排序。
- [x] 2.6 实现指定 URL 观测结果归一化，支持采集时间、可见指标、页面状态和不可获取原因。

## 3. Provider 实现

- [x] 3.1 将现有 `controlled_web_search` 能力迁移或包裹为通用 Web Search Provider，并保留测试替身。
- [x] 3.2 增加可配置的通用搜索 Provider 入口，第一版支持 Tavily、Brave 或现有 provider 中至少一种真实联网实现。
- [x] 3.3 增加网页正文抓取 Provider 预留接口，允许后续接入 Firecrawl 或 XCrawl。
- [x] 3.4 增加平台专项 Provider 预留接口，允许后续接入 Apify、ScrapeCreators 或 xiaohongshu-mcp。

## 4. Browser Research Provider

- [x] 4.1 封装 `agent-browser.dev` CLI 调用，提供打开页面、读取页面快照、有限交互和截图采集能力。
- [x] 4.2 实现任务级 browser session 命名规则，禁止多个任务共享默认 session。
- [x] 4.3 实现同一 session 串行执行和全局浏览器并发池，默认并发不超过 2，最大不超过 3。
- [x] 4.4 增加域名白名单、最大步骤数、超时时间、最大截图数和最大返回正文长度限制。
- [x] 4.5 在 `agent-browser.dev` 未安装、Chrome 不可用或页面受阻时返回可理解失败原因。
- [x] 4.6 为浏览器观察增加观测模式入口，支持对指定发布链接读取页面可见指标。

## 5. Agent 与营养汲取对接

- [x] 5.1 新增或改造联网研究 Tool，使营养汲取 Skill 通过 Tool 获取研究上下文包。
- [x] 5.2 调整营养汲取 Skill，让其基于研究上下文包生成普通回复和可沉淀营养块。
- [x] 5.3 确保联网研究结果不会自动写入正式营养库或公共营养库，只能成为候选营养。
- [x] 5.4 在 Agent Trace 中记录查询规划、Provider 路由、Provider 调用、结果归一化、降级和总结阶段。
- [x] 5.5 确保 Trace 和日志不泄露 API Key、登录 Cookie、本地绝对路径或超长原文。

## 6. 数据回流监控器预留对接

- [x] 6.1 为数据回流领域预留联网观测调用边界，使后续监控器可以按发布链接请求观测结果。
- [x] 6.2 确保联网观测结果不直接创建反馈快照，快照创建仍通过数据回流领域服务完成。
- [x] 6.3 确保当前人为监控器手动录入和编辑反馈快照能力不受影响。

## 7. 测试与验证

- [x] 7.1 为 Query Planner、兜底规划、Provider Router、结果归一化、观测结果归一化和去重排序补充单元测试。
- [x] 7.2 为 Browser Research Provider 增加 fake CLI 或 fake provider 测试，覆盖 session 隔离、并发限制、域名限制和超时失败。
- [x] 7.3 为营养汲取 Agent 增加集成测试，验证多源研究上下文能产出可沉淀营养块。
- [x] 7.4 为数据回流观测预留边界增加测试，验证观测结果不会绕过反馈领域直接写快照。
- [x] 7.5 增加配置缺失场景测试，验证外部 provider 不可用时返回可理解原因。
- [x] 7.6 运行 `npm run typecheck` 和 `npm test`，确保现有枝化生长、基因汲取、营养库和数据回流能力不回归。
