## 1. 顶层文档与契约对齐

- [ ] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，补充“初步搜索 + 深入探索”的双层联网研究框架。
- [ ] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，明确 Search Provider、Browser Action Runtime、Platform Browser Strategy 与 Provider Router 的边界。
- [ ] 1.3 审核并按需更新 `docs/design/内容森林架构设计文档.md`，说明联网数据获取模块是营养库活化和后续数据监控器的共享基础设施。
- [ ] 1.4 审核 `docs/api/nutrient.yaml`，如果需要向前端暴露研究阶段、受限状态或结果可信层级，先更新 API 契约。
- [ ] 1.5 审核 `docs/sql/nutrient.sql` 与相关 SQL 文档，本次默认不新增表；若实现中需要持久化研究结果层级或 Provider 调用记录，先补齐 SQL 契约。

## 2. 查询规划与类型契约

- [ ] 2.1 扩展联网研究类型契约，定义初步搜索请求、深入探索请求、候选线索、已观察案例和结构化受限状态。
- [ ] 2.2 优化 Query Planner，清洗“找几篇、保留案例、梳理核心、5~10篇”等任务指令噪声。
- [ ] 2.3 让 Query Planner 同时输出通用搜索关键词和平台站内搜索关键词。
- [ ] 2.4 增加 Query Planner 单元测试，覆盖小红书 AI 产品案例研究、无平台请求和任务指令清洗。

## 3. 初步搜索层

- [ ] 3.1 新增 Search Provider 抽象，确保搜索 API Provider 与 Browser Action 解耦。
- [ ] 3.2 接入至少一个真实 API 型 Search Provider 或完成可配置适配入口，优先考虑 Brave、Tavily 或 SerpApi。
- [ ] 3.3 为 Search Provider 增加配置缺失、Key 缺失、额度不足、网络失败等结构化失败返回。
- [ ] 3.4 移除或禁止默认通过 Bing 网页 UI 执行初步搜索的路径。
- [ ] 3.5 为初步搜索层增加 fake provider 测试，覆盖成功、失败、空结果和 Provider 降级。

## 4. 深入探索层与平台策略

- [ ] 4.1 将现有 Browser Provider 拆分或重构为 Browser Action Runtime 与 Platform Browser Strategy。
- [ ] 4.2 定义 Platform Browser Strategy 接口，表达平台入口、站内搜索、结果读取、详情读取和受限状态识别。
- [ ] 4.3 实现小红书第一版 Browser Strategy，优先访问小红书站点或小红书候选链接，不再默认访问 Bing 搜索页。
- [ ] 4.4 支持 Browser Action 根据站内搜索关键词执行打开、观察、输入、提交、读取结果和打开候选详情的受控步骤。
- [ ] 4.5 保留任务级 session、并发池、域名白名单、超时、最大步骤数和最大输出长度限制。
- [ ] 4.6 为 Browser Strategy 增加 fake browser 测试，覆盖站内搜索成功、登录受限、验证码受限、布局变化和超时。

## 5. Provider Router 编排与结果归一化

- [ ] 5.1 优化 Provider Router，使其按“初步搜索 -> 深入探索”的顺序执行，并支持触发条件配置。
- [ ] 5.2 支持在初步搜索结果不足、用户要求深入查看、或平台策略要求时进入深入探索层。
- [ ] 5.3 归一化结果时区分候选线索、已观察案例和完整已观察案例。
- [ ] 5.4 识别验证码、登录墙、访问限制、空结果、布局变化和 Provider 不可用状态，禁止把受限页面当作有效结果。
- [ ] 5.5 为结果去重、结果层级升级和受限状态归一化补充单元测试。

## 6. Agent Skill 对接与可观测性

- [ ] 6.1 调整营养汲取 Skill 的联网研究上下文，让 Agent 明确区分候选线索、已观察案例和受限状态。
- [ ] 6.2 更新 Agent 系统提示，禁止 Agent 基于受限页面或候选线索编造“真实案例”。
- [ ] 6.3 在 Trace 中记录查询规划、初步搜索 Provider、深入探索触发原因、平台策略、Browser Action 步骤摘要、结果层级和受限状态。
- [ ] 6.4 确保 Trace 和日志不泄露 API Key、Cookie、本地绝对路径或超长页面原文。

## 7. 验证与回归

- [ ] 7.1 增加联网研究集成测试，验证“小红书 AI 产品案例”请求不会默认访问 Bing 网页 UI。
- [ ] 7.2 增加营养汲取 Agent 测试，验证搜索受限时返回真实限制说明而不是编造案例。
- [ ] 7.3 增加配置缺失测试，验证没有 Search Provider Key 时返回可理解原因且不影响其他 Agent 能力。
- [ ] 7.4 运行 `openspec validate upgrade-networked-research-search-and-browser-exploration --strict`。
- [ ] 7.5 运行 `npm run typecheck`、`npm run lint` 和 `npm test`。
