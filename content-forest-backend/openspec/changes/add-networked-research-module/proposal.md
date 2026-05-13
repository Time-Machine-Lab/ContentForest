## Why

第二期营养库活化要求 Agent 能围绕平台语感、爆款案例、内容规则和用户评论进行真实联网研究。当前营养汲取链路依赖单一、较弱的受控搜索能力，无法稳定覆盖小红书、抖音等需要真实页面观察或平台专项数据源的场景，容易出现“搜索不到直接匹配结果”的假失败。

## What Changes

- 新增联网研究模块，将搜索能力从单一 Tool 升级为可插拔的 Research Provider 架构。
- 支持查询规划、通用 Web 搜索、网页正文抓取、浏览器观察和平台专项数据源的统一路由。
- 新增 Browser Research 能力，用 `agent-browser.dev` 作为第一版真实网页观察工具，按任务隔离 session 并限制并发。
- 为营养汲取 Agent 提供多源研究上下文包，支持结果归一化、去重、新鲜度标记、相关性排序和失败降级。
- 明确小红书/抖音等平台不依赖通用搜索 API 作为唯一来源，允许通过 browser provider 或后续平台专项 provider 扩展。
- 同步更新顶层设计文档，将“联网研究模块”作为营养库活化和 Agent 工具层的基础架构保留。
- 如涉及 HTTP API 或存储结构，必须同步更新 `docs/api/nutrient.yaml`、`docs/api/agent.yaml` 或对应 SQL 文档；一份 `.yaml` 仍对应一个 Controller 文件，一张表对应一个 `.sql` 文件。

## Capabilities

### New Capabilities
- `networked-research-module`: 定义联网研究模块的查询规划、Provider 路由、浏览器观察、结果归一化、安全边界和营养汲取对接规则。

### Modified Capabilities
- `agent-core-runtime`: Agent Tool Runtime 需要支持联网研究类 Tool 的受控调用、trace 记录、超时与失败包装。
- `content-evolution-strategy`: 内容进化策略需要承认“联网研究上下文包”是上下文补全层的一种资料来源，但不能让搜索模块直接决定内容是否会爆。

## Impact

- 影响 `src/agent/` 下 Tool、Skill、Runtime、Trace 与配置装配。
- 影响 `src/modules/nutrient/` 下营养汲取任务的 Agent 输入和结果消费方式。
- 可能新增外部依赖或运行时配置：通用搜索 provider API key、Firecrawl/XCrawl 类网页抓取配置、`agent-browser.dev` CLI 与 Chrome 环境。
- 需要增加 provider 级 fake 实现，保证测试不依赖真实外网和真实浏览器。
- 需要更新 `docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林Agent架构设计文档.md` 等顶层设计文档中关于营养汲取、Agent Tool 和联网研究能力的描述。
