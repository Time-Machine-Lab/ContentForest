## Why

第二期需要把枝化生长从一次黑盒 Agent 调用升级为可编排、可观测、可迭代的内容进化管线。当前生长策略、突变探索、本轮上下文和生成中进度缺少明确契约，用户和开发者都难以判断果实为什么这样生成、生成到哪一步。

## What Changes

- 将枝化生长后端编排拆成输入层、上下文补全层、创作搜索层、注意力编排层、生成执行层和结果封装层。
- 新增本轮生长简报作为临时 Agent 输入上下文，不作为长期领域对象持久化。
- 新增搜索模式与突变激进程度：用户可选择，系统可推荐；不暴露数字突变率。
- 突变方向由创作搜索层基于种子、主简报、父果实、营养、基因和用户输入动态发现，不写死为固定枚举。
- 增加生成中路径图能力：管线提供固定大阶段，Agent 可补充子步骤；该路径只用于生成中展示和追踪。
- 更新顶层契约时必须先改 `docs/api/growth.yaml`、`docs/sql/growth.sql` 和相关领域/Agent 架构文档，再开发后端代码。

## Capabilities

### New Capabilities

- `branch-growth-pipeline`: 枝化生长管线、本轮生长简报、搜索模式、突变激进程度和生成路径图。

### Modified Capabilities

- `branch-growth`: 枝化生长请求、任务状态、attempt 执行和任务查询需要暴露管线相关语义。
- `branch-growth-agent-connection`: AgentPort 输入输出需要支持本轮生长简报、搜索/突变计划和进度步骤。
- `content-evolution-strategy`: 内容进化策略需要表达动态突变方向和系统推荐默认值。

## Impact

- 顶层文档：`docs/内容森林第二期开发规划文档.md`、`docs/design/domain/枝化生长领域模块设计文档.md`、`docs/design/内容森林Agent架构设计文档.md`。
- API 契约：`docs/api/growth.yaml`。
- SQL 契约：`docs/sql/growth.sql`。
- 后端模块：Growth Controller、Growth 应用服务、Growth Repository、AgentPort 适配、枝化生长 Agent skill 对接、Agent trace/exchange log。
- 不引入通用任务系统、消息队列、自动无限迭代或重型推荐算法服务。
