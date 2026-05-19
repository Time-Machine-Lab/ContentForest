## 1. 顶层文档与配置契约

- [x] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，将小红书营养研究说明为 xiaohongshu-cli 确定性证据 Provider，而不是 OpenClaw 或旧搜索 API 默认链路。
- [x] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，补充 Goal Planner、Platform Router、Candidate Discovery、Detail Enrichment、Coverage/Quality Gate、Nutrient Synthesis 的新层级边界。
- [x] 1.3 更新 `docs/design/domain/营养库领域模块设计文档.md` 中营养研究会话与可沉淀营养块说明，强调平台证据只作为候选资料，用户确认前不入正式营养库。
- [x] 1.4 检查 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql` 是否需要响应字段或存储结构变更；若无变更，在实现记录中说明本提案不新增 API 契约和 SQL 表。
- [x] 1.5 更新 `.env.example`，新增 xiaohongshu-cli Provider 的启用开关、CLI 路径、超时、最大结果数、默认排序和登录态检查配置占位。

## 2. Provider Router 与层级结构改造

- [x] 2.1 将默认联网研究链路改造为目标规划、平台路由、候选发现、详情补全、覆盖率/质量门控、营养综合的分层流程。
- [x] 2.2 为小红书平台路由增加确定性匹配规则，识别 `小红书`、`xhs`、`xiaohongshu`、`rednote` 等别名。
- [x] 2.3 将 Codex external research 保留为 coverage gate 后的补盲/深研层，并实现结果不足、Provider 不可用、需求宽泛时的触发条件。
- [x] 2.4 从默认营养研究链路移除 OpenClaw Provider 和旧搜索 API / PublicWebSearch / BrowserResearch / placeholder Provider 注册。
- [x] 2.5 删除或断开 `controlled_web_search` 在营养研究中的遗留入口，确保营养研究只通过 `networked_research` 受控入口执行。

## 3. xiaohongshu-cli Provider 实现

- [x] 3.1 实现 xiaohongshu-cli runner，使用非交互式子进程调用并支持超时、stdout/stderr 裁剪和 AbortSignal。
- [x] 3.2 实现 `xhs status --json` 健康检查，映射未登录、Cookie 过期、验证码、IP 限制和 CLI 不可用状态。
- [x] 3.3 实现 `xhs search <keyword> --json` 候选发现解析，支持关键词、排序、分页和最大结果数。
- [x] 3.4 实现 `xhs read <note_id_or_url> --json` 详情补全解析，提取标题、正文、作者、封面、发布时间和互动数据。
- [x] 3.5 将 xiaohongshu-cli 输出 envelope 映射为 `RawNetworkResearchItem`，并正确设置 platform、providerName、phase、resultQuality 和 restrictedStatus。
- [x] 3.6 对 CLI stderr、Cookie、浏览器路径、本地绝对路径和长正文进行脱敏或裁剪，禁止进入 Agent 可见上下文。

## 4. 证据质量与营养产出质量

- [x] 4.1 扩展归一化逻辑，支持作者、封面、正文摘要、证据完整度和平台原始 ID 的统一表达。
- [x] 4.2 实现 `candidate_lead`、`observed_case`、`complete_observed_case` 的小红书判定规则。
- [x] 4.3 实现覆盖率和质量门控摘要，记录目标数量、完整案例数量、受限状态和 Codex 是否触发。
- [x] 4.4 更新营养研究 Skill prompt/context，要求基于证据层级生成营养，禁止把候选线索或受限状态说成真实帖子。
- [x] 4.5 增加可沉淀营养块的来源引用要求，使标题钩子、封面策略、正文结构、用户痛点和互动信号能回溯到具体帖子证据。

## 5. 测试与验收

- [x] 5.1 增加 xiaohongshu-cli runner 单元测试，覆盖成功输出、非 JSON 输出、超时、stderr 脱敏和进程失败。
- [x] 5.2 增加 xiaohongshu-cli Provider 单元测试，覆盖搜索、详情补全、字段映射、质量分层和受限状态。
- [x] 5.3 增加 Provider Router 测试，确认小红书请求优先进入 xiaohongshu-cli，结果不足时才触发 Codex deep research。
- [x] 5.4 增加营养研究 Skill 测试，确认实采证据、候选线索和受限状态在输出中被正确区分。
- [x] 5.5 运行 `npm run typecheck`、`npm run lint`、`npm test` 和 `openspec validate connect-xiaohongshu-cli-research-provider --strict`。
- [ ] 5.6 在已安装并登录 xiaohongshu-cli 的环境中执行验收采集，生成 `openspec/changes/connect-xiaohongshu-cli-research-provider/acceptance/xiaohongshu-ai-product-posts.md`，包含 5 条 AI 产品相关小红书帖子的详情和帖子数据。
