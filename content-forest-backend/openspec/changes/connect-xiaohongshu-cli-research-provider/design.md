## Context

当前营养研究通过 `NutrientResearchSkill -> networked_research Tool -> NetworkProviderRouter` 获取联网研究包。现有默认配置偏向 OpenClaw 外部 Agent 主链路与 Codex fallback，旧 Search API、PublicWebSearch、BrowserResearch 等实现默认关闭但仍在代码中存在。这个结构能提供广域研究，但对“小红书 AI 产品帖子”这类需要原帖详情、作者、封面、正文和互动数据的任务，事实层不够确定，也难以控制 TikHub 小红书 API 成本。

第二期开发规划明确营养库活化是“联网研究 -> 卡片化整理 -> 临时引用 -> 沉淀入库”的流程；Agent 架构文档要求联网访问必须通过受控 Provider Router，Skill 不接收 API Key、浏览器登录态、本地 Profile 路径或 Provider 私有配置；营养库领域设计要求研究结果是候选资料，不能自动污染正式营养库。本设计延续这些边界，把小红书采集变成后端受控 Provider，而不是暴露给 Agent 自由调用。

## Goals / Non-Goals

**Goals:**

- 接入 `xiaohongshu-cli`，支持小红书关键词搜索和笔记详情采集。
- 在小红书链路中获得帖子标题、正文、封面、作者、链接、发布时间、点赞数、评论数、收藏数等可用数据；浏览数不是本次必需字段。
- 把联网研究层级升级为证据驱动流程：Goal Planner、Platform Router、Candidate Discovery、Detail Enrichment、Coverage/Quality Gate、Nutrient Synthesis。
- 保留 Codex external research，用于 CLI 不可用、结果不足、用户需求宽泛或需要归纳分析时的补盲/深研。
- 验收时生成 `acceptance/xiaohongshu-ai-product-posts.md`，包含 5 条 AI 产品相关小红书帖子详情和帖子数据。

**Non-Goals:**

- 不把小红书 Cookie、浏览器 Profile 路径或二维码登录过程暴露给 Agent。
- 不使用 TikHub 小红书 API 作为默认小红书采集路径。
- 不实现自动点赞、收藏、评论、关注、发布等写操作。
- 不新增营养库数据库表；采集结果仍通过研究上下文和可沉淀营养块流转。
- 不让 CLI 原始长正文、Cookie、完整 stderr 或本地路径进入 Trace。

## Decisions

### Decision 1: 使用本地 CLI Provider，而不是直接嵌入小红书逆向 SDK

实现 `XiaohongshuCliResearchProvider`，通过 `execFile` 调用 `xhs search <keyword> --json` 和 `xhs read <note_id_or_url> --json`。Provider 负责解析 `ok/schema_version/data/error` envelope，并映射为统一研究结果。

选择 CLI 的原因是：`xiaohongshu-cli` 已经封装 Cookie 提取、二维码登录、签名、限速、重试和结构化输出；后端只需要稳定调用进程和解析 JSON。替代方案是直接依赖其内部 Python 包或重写签名逻辑，但这会增加维护成本，也让后端承担更高的平台风控适配责任。

### Decision 2: 小红书平台路由进入确定性证据链路

Query Planner 识别到 `小红书/xhs/xiaohongshu/rednote` 时，Platform Router 直接选择 xiaohongshu-cli Provider。流程为：

```text
用户需求
  -> Goal Planner 提取目标：平台、关键词、数量、内容对象
  -> xhs search 获取候选笔记
  -> xhs read 补齐详情
  -> Evidence Normalizer 映射字段
  -> Coverage/Quality Gate 判断是否够用
  -> Nutrient Synthesis 生成可沉淀营养
```

如果用户没有指定小红书，则本 Provider 不主动抢占其他平台请求。

### Decision 3: 引入证据完整度和营养质量门控

小红书详情结果只有在至少具备标题、正文或正文摘要、作者、链接、可复查 ID/URL，并且包含任一互动数据时，才标记为 `complete_observed_case`。只有搜索列表但没有详情的结果标记为 `candidate_lead`。

Coverage/Quality Gate 至少检查：

- 是否达到用户需要的结果数或默认结果数。
- `complete_observed_case` 数量是否足够。
- 是否包含帖子正文/作者/互动数据。
- 是否出现登录、验证码、IP 限制、空结果或 CLI 不可用。

门控不够时，系统可以启用 Codex external research，但 Codex 只能补关键词、背景、竞品脉络和候选线索，不能把推断内容升级为小红书实采数据。

### Decision 4: CLI 登录态由运维准备，Provider 只做状态检查和错误表达

实现前置健康检查：`xhs status --json`。如果未登录、Cookie 过期、验证码、IP blocked 或 CLI 不存在，Provider 返回结构化 `restrictedStatus` 或 failure。系统不在 Agent 运行时触发交互式二维码登录。

这样能保持后端服务可预测，也避免在用户请求过程中卡住交互流程。登录态刷新作为部署/运维步骤处理。

### Decision 5: 旧默认搜索工具从营养链路退出

OpenClaw Provider、ConfiguredSearchApiProvider、PublicWebSearchProvider、BrowserResearchProvider、WebPageFetchPlaceholderProvider、PlatformDataPlaceholderProvider、controlled_web_search 等旧入口不参与默认营养研究。Codex external research 保留，但定位为深研/补盲层。

旧代码的删除可以在本变更实现中完成；如果存在测试仍依赖旧 Provider，应改写为新 Provider 或专门 fake provider。

### Decision 6: 验收 Markdown 是提案目录下的工程产物

实现验收时运行小红书采集任务，关键词可使用 `AI产品` 或 `AI 产品`，收集 5 条相关笔记，输出到：

`openspec/changes/connect-xiaohongshu-cli-research-provider/acceptance/xiaohongshu-ai-product-posts.md`

Markdown 应包含采集时间、命令摘要、登录态限制说明、每条帖子的标题、链接/ID、作者、封面、正文摘录或正文、点赞数、评论数、收藏数、发布时间和 Provider trace 摘要。

## Risks / Trade-offs

- `xiaohongshu-cli` 未安装或版本变化 -> 增加启动配置和健康检查，错误以 `provider_unavailable` 返回。
- 小红书登录态过期或验证码限制 -> 返回 `restricted_by_login` / `restricted_by_captcha`，不编造帖子数据。
- CLI 输出 schema 变化 -> Provider 只接受稳定 envelope，并为解析失败增加测试。
- CLI 调用慢或风控限速 -> 设置超时、最大详情读取数和串行/低并发策略。
- 搜索结果相关性不足 -> 通过详情读取、关键词清洗和质量门控过滤；必要时启用 Codex 扩展关键词。
- 本地 Cookie 或路径泄露 -> stderr、Trace、错误消息统一脱敏和裁剪。

## Migration Plan

1. 更新顶层文档，说明小红书从外部 Agent 委托研究迁移为 xiaohongshu-cli 确定性证据 Provider。
2. 增加配置项和 `.env.example` 占位，包括 CLI 可执行路径、超时、最大结果数、是否启用、排序策略。
3. 实现 CLI runner、Provider、错误映射、结果解析和归一化。
4. 调整 Provider Router：小红书请求优先进入 xiaohongshu-cli；Codex 仅在门控触发时进入深研。
5. 移除或断开旧默认搜索 Provider 与 OpenClaw 默认链路。
6. 增加单元测试、集成测试和验收采集 Markdown。

Rollback 策略：通过配置关闭 xiaohongshu-cli Provider，使小红书请求进入 Codex external research 的候选线索/深研模式，但返回结果不得标记为实采小红书帖子。

## Open Questions

- 生产部署是否允许后端机器长期维护小红书登录 Cookie，还是只在本地研究环境启用？
- 小红书默认排序采用 `general`、`popular` 还是由用户需求推断？
- 是否需要在前端展示“实采平台证据”和“Codex 深研补充”的来源标签？
