## Why

第二期营养库活化要求 Agent 能围绕平台语感、爆款案例、内容规则和用户评论进行真实联网研究；后续数据回流监控器也需要对已发布链接定时采集点赞、收藏、观看等外部表现数据。当前系统依赖单一、较弱的受控搜索能力，无法稳定覆盖小红书、抖音等需要真实页面观察或平台专项数据源的场景，也无法复用给发布后数据监控。

## What Changes

- 新增泛用联网数据获取模块，将搜索能力从单一 Tool 升级为可插拔的 Network Provider 架构。
- 支持两类调用模式：研究模式用于发现资料和案例，观测模式用于对指定 URL 或平台对象采集当前表现数据。
- 支持查询规划、通用 Web 搜索、网页正文抓取、浏览器观察、指定链接观测和平台专项数据源的统一路由。
- 新增 Browser Research 能力，用 `agent-browser.dev` 作为第一版真实网页观察工具，按任务隔离 session 并限制并发。
- 为营养汲取 Agent 提供多源研究上下文包，支持结果归一化、去重、新鲜度标记、相关性排序和失败降级。
- 明确小红书/抖音等平台不依赖通用搜索 API 作为唯一来源，允许通过 browser provider 或后续平台专项 provider 扩展。
- 同步更新顶层设计文档，将“联网数据获取模块”作为营养库活化、Agent 工具层和后续数据监控器的共享基础架构保留。
- 如涉及 HTTP API 或存储结构，必须同步更新 `docs/api/nutrient.yaml`、`docs/api/agent.yaml` 或对应 SQL 文档；一份 `.yaml` 仍对应一个 Controller 文件，一张表对应一个 `.sql` 文件。

## Capabilities

### New Capabilities
- `networked-research-module`: 定义泛用联网数据获取模块的查询规划、Provider 路由、浏览器观察、指定链接观测、结果归一化、安全边界、营养汲取对接和监控器复用规则。

### Modified Capabilities
- `agent-core-runtime`: Agent Tool Runtime 需要支持联网研究类 Tool 的受控调用、trace 记录、超时与失败包装。
- `content-evolution-strategy`: 内容进化策略需要承认“联网研究上下文包”是上下文补全层的一种资料来源，但不能让搜索模块直接决定内容是否会爆。
- `data-feedback`: 数据回流监控器需要能复用联网数据获取模块的观测模式，对已发布链接采集外部表现快照，但快照创建和监控器调度仍属于数据回流领域。

## Impact

- 影响 `src/agent/` 下 Tool、Skill、Runtime、Trace 与配置装配。
- 影响 `src/modules/nutrient/` 下营养汲取任务的 Agent 输入和结果消费方式。
- 影响 `src/modules/feedback/` 后续自动监控器实现，观测能力应复用同一 Provider 层，但不得改变当前人为监控器行为。
- 可能新增外部依赖或运行时配置：通用搜索 provider API key、Firecrawl/XCrawl 类网页抓取配置、`agent-browser.dev` CLI 与 Chrome 环境。
- 需要增加 provider 级 fake 实现，保证测试不依赖真实外网和真实浏览器。
- 需要更新 `docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林Agent架构设计文档.md` 等顶层设计文档中关于营养汲取、Agent Tool 和联网研究能力的描述。
