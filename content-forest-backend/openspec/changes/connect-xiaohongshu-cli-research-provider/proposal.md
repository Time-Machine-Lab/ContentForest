## Why

当前营养汲取的联网研究默认依赖 OpenClaw 外部 Agent 和 Codex fallback，平台帖子事实来源不够确定，且小红书使用 TikHub API 的成本较高。第二期开发规划已经把营养库活化定义为“围绕种子持续联网研究、补充、引用、沉淀和验证的营养工作台”，小红书内容是核心平台资料来源，因此需要接入可控、低成本、可追溯的小红书采集链路。

本提案参考 `docs/内容森林第二期开发规划文档.md` 的营养库活化目标、`docs/design/内容森林Agent架构设计文档.md` 的受控 Tool / Provider Router 边界，以及 `docs/design/domain/营养库领域模块设计文档.md` 中“研究会话产出候选资料，不直接污染正式营养库”的约束。

## What Changes

- 新增 `xiaohongshu-cli` 小红书研究 Provider，用于关键词搜索小红书笔记并读取笔记详情、作者、封面、正文和互动数据。
- 将当前联网研究层级从“外部 Agent 委托优先”优化为“目标规划 -> 平台路由 -> 候选发现 -> 详情补全 -> 覆盖率/质量门控 -> 营养综合”的证据驱动流程。
- 小红书平台路由优先使用 `xiaohongshu-cli`，不使用 TikHub 小红书接口作为默认路径，以控制成本。
- 保留 Codex external research，但只在小红书 CLI 不可用、结果不足、需求超出小红书平台事实采集范围或需要深度归纳时启用。
- 删除 OpenClaw Provider 在默认链路中的角色；旧搜索 API Provider、公开网页搜索 Provider、浏览器平台策略不再参与营养研究默认链路。
- 扩展归一化结果字段，使平台帖子结果能够表达作者、封面、正文摘要、互动数据、采集方法、证据完整度和受限状态。
- 验收时在本提案目录下生成 `acceptance/xiaohongshu-ai-product-posts.md`，包含 5 条 AI 产品相关小红书帖子的帖子详情和帖子数据。

## Capabilities

### New Capabilities

<!-- None. This change adds a platform provider inside the existing networked research capability. -->

### Modified Capabilities

- `networked-research-module`: 增加 xiaohongshu-cli Provider、证据驱动结果结构、质量门控和 Codex 深研触发条件。
- `networked-research-discovery-pipeline`: 将原“初步搜索 + 深入探索”升级为“候选发现 + 详情补全 + 覆盖率/质量门控”的平台证据管线。
- `nutrient-research-agent`: 要求营养研究 Skill 使用证据层级与质量评分生成可沉淀营养块，并禁止把候选线索表述为已验证平台事实。

## Impact

- 后端 Agent 联网研究模块：新增 xiaohongshu-cli Provider、CLI 子进程调用封装、超时、错误映射和结构化输出解析。
- 后端配置：新增 xiaohongshu-cli 可执行文件路径、超时、默认排序、登录态检查和最大结果数等配置；不新增数据库表。
- Provider Router：调整默认 Provider 注册和路由策略，小红书请求进入 xiaohongshu-cli，Codex 仅作为深研/补盲层。
- 营养研究输出：保留只读 Tool 边界，研究结果仍作为候选营养资料返回，不直接写入正式营养库、公共营养库或反馈事实。
- 文档：更新 `docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林Agent架构设计文档.md`、`.env.example`；如 API 响应契约变化，再同步 `docs/api/nutrient.yaml`。
- 验收产物：实现完成后在 `openspec/changes/connect-xiaohongshu-cli-research-provider/acceptance/` 下输出小红书采集 Markdown 样例。
