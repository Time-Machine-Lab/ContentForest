## Why

当前联网研究已经从单一搜索工具升级为 Provider Router，但实际运行暴露出两个关键问题：浏览器 Provider 被当作“搜索引擎页面截图器”使用，容易被 Bing 等搜索页验证拦截；同时验证码页、登录页等受限页面会被误当成有效研究结果传给 Agent。内容森林第二期需要让营养库真正“活起来”，因此联网研究必须从“打开搜索页”升级为“初步搜索 + 平台深入探索”的可迭代框架。

## What Changes

- 将联网研究流程拆分为两层：初步搜索层负责广度发现，深入探索层负责在明确平台上通过 Browser Action 做站内搜索、候选内容打开和真实页面观察。
- 引入 Search Provider 抽象，用于接入 Brave、Tavily、SerpApi 等真实搜索 API；移除对搜索引擎网页 UI 的默认依赖。
- 引入 Platform Browser Strategy 抽象，用于按平台定义首页入口、站内搜索、结果卡片读取、详情页读取和受限状态识别。
- 小红书作为第一版平台探索样板：当目标平台为小红书且需要案例深挖时，Browser Action 应优先进入小红书站点而不是 Bing 搜索页。
- 为验证码、登录墙、布局变化、无结果、Provider 不可用等失败情况定义结构化状态，禁止把受限页面当成有效案例。
- 优化 Query Planner，去除“找几篇、保留、梳理核心”等任务指令噪声，生成更适合搜索和站内探索的关键词。
- 增加候选线索与已观察案例的分层：搜索 API 返回的是候选线索，Browser 打开并读取后才是已观察案例。
- 更新顶层设计文档，明确联网研究模块的双层架构、Browser Action 定位、平台策略边界和数据监控器后续复用方式。
- 不新增正式营养内容自动入库行为；搜索和探索结果仍只作为可沉淀营养候选，由用户或营养领域规则确认后沉淀。

## Capabilities

### New Capabilities
- `networked-research-discovery-pipeline`: 定义联网研究的双层发现管线，包括初步搜索、平台深入探索、平台策略、受限状态识别、结果分层和可观测性。

### Modified Capabilities
<!-- 无。Agent Tool 层的对接要求归入新能力 `networked-research-discovery-pipeline` 的行为契约中，本次不修改既有 Agent Runtime 基础要求。 -->

## Impact

- 影响 `src/agent/networked-research/` 下的 Query Planner、Provider Router、Browser Provider、结果归一化和测试。
- 影响 `src/agent/tools/networked-research-tool.ts` 与营养汲取 Skill 获取联网研究上下文包的方式。
- 可能新增搜索 API Provider 运行时配置，例如 Brave、Tavily 或 SerpApi 的 API Key；不要求本次新增数据库表。
- 不改变营养库 API 的主流程；如实现中需要向前端暴露更细的研究状态，必须先更新 `docs/api/nutrient.yaml`。
- 需要更新 `docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林Agent架构设计文档.md`，必要时同步 `docs/design/内容森林架构设计文档.md`。
