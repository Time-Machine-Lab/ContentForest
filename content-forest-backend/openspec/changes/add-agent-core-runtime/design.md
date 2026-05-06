## Context

内容森林后端已经按照架构文档预留了 `src/agent/ports`、`src/agent/runtime`、`src/agent/skills` 目录，但目前还没有可用的 Agent Core。现有种子与生成器模块已经采用模块化单体、端口适配、内容访问层和存储端口等模式，Agent Core 应延续这些边界。

根据 `docs/design/内容森林Agent架构设计文档.md`，Agent 层应作为架构能力层存在，而不是业务领域。第一期 Agent 只需要为后续枝化生长和基因汲取提供底座。本次变更只实现底层能力，不实现具体读取 Tool，不实现枝化生长 Skill 和基因汲取 Skill，也不把 Agent 能力暴露为 HTTP API。

用户明确希望本次可以直接接入 AI 供应商，使用 OpenAI API 兼容格式。供应商为 MiniMax，但 API Key 必须只来自环境变量，不能写入代码、文档、测试快照或提交到 Git。根据 MiniMax 官方文档，OpenAI 兼容接口使用 `https://api.minimaxi.com/v1` 作为 Base URL，并使用 OpenAI SDK 兼容的 API Key 配置方式。

## Goals / Non-Goals

**Goals:**

- 定义最底层 AgentPort，以通用任务方式运行 Agent，而不是直接暴露业务专用方法。
- 实现内置 Agent Runtime 的最小运行链路：接收任务、执行 Skill、执行输出校验、记录 Trace、返回结果。
- 定义 Agent 任务、任务类型、任务上下文、任务输入、任务结果、错误结果等核心模型。
- 实现 Tool Registry 和 Tool Runtime 的底座，支持注册与调用 Tool，但不实现具体业务读取 Tool。
- 定义 Tool 契约，并保留只读 Tool 语义；本次不做严格授权模型。
- 实现 Skill Registry / Skill Runtime 底座，支持注册和执行 Skill，但不实现具体业务 Skill。
- 定义 LLM Adapter 契约，并实现 OpenAI API 兼容的 HTTP Adapter。
- 支持通过环境变量配置 Agent/LLM 供应商、Base URL、模型和 API Key。
- 在启用真实 LLM Adapter 但环境变量缺失时，启动阶段向命令行输出明确提示，并阻止真实 Agent 调用被误认为可用。
- 提供 Fake/Stub LLM Adapter、Fake Skill、Fake Tool 等测试替身，支撑 Agent Core 单元测试。
- 确保 `.env` 等本地密钥文件不会提交，并提供不含真实 Key 的示例配置。

**Non-Goals:**

- 不实现 `ReadSeedContent`、`ReadFruitContent`、`ReadGeneratorSkill` 等具体 Tool。
- 不实现枝化生长 Skill、基因汲取 Skill 或生成器 Skill 执行逻辑。
- 不新增 HTTP Controller 或前端调用入口。
- 不新增数据库表，不写入 Agent 任务持久化。
- 不做严格 Tool 授权模型；本次只保留任务上下文与 Tool 调用边界。
- 不做多 Agent 协作、长期记忆、自主规划器、任务队列或分布式调度。
- 不在代码、文档或测试中保存真实 API Key。

## Decisions

### 决策一：AgentPort 先暴露通用 `runTask` 风格能力

业务模块未来会需要枝化生长和基因汲取，但本次底座不应过早绑定具体业务参数。AgentPort 先暴露通用任务运行入口，由任务类型表达当前任务属于枝化生长或基因汲取。

备选方案是直接暴露 `runGrowth` 和 `runGeneExtraction`。该方案对业务更直观，但会让底座阶段过早进入具体业务输入输出设计。通用任务入口更适合当前“先打地基”的范围，后续可以由业务服务包装出更明确的方法。

### 决策二：Runtime 只做一次性内存任务运行

Agent Runtime 本次只负责一次任务从输入到输出的内存执行，不做任务持久化、后台队列或恢复机制。Trace 也优先作为本次执行结果的一部分返回或供测试观察。

这样可以满足第一期底层验证需求，同时避免引入数据库结构和调度复杂度。后续如果枝化生长任务需要持久化状态，应由枝化生长领域或独立任务机制设计，不反向污染 Agent Core。

### 决策三：Tool 底座先支持注册与调用，但不实现严格授权

架构文档强调任务授权范围，但用户确认本次不需要严格实现 Tool 授权模型。因此本次实现保留任务上下文、Tool 调用入口和只读语义，不做复杂资源授权校验。

折中方式是：Tool 契约可以接收任务上下文，便于后续加入严格授权；Tool Runtime 目前只负责查找、调用、错误包装和 Trace 记录。这样不会阻碍后续升级，也不让第一期底座过重。

### 决策四：Skill Runtime 只负责调度 Skill，不理解业务语义

Skill Runtime 根据任务类型或任务指定的 Skill 标识找到对应 Skill 并执行。Skill Runtime 不关心枝化生长或基因汲取内部流程，也不解析生成器输出。

这样可以让后续内置枝化生长 Skill、内置基因汲取 Skill 作为独立实现挂入 Runtime，而不让底座承载业务流程。

### 决策五：LLM Adapter 使用 OpenAI API 兼容 HTTP 实现

本次直接实现真实 LLM Adapter，但采用 OpenAI API 兼容格式。配置项通过环境变量传入，建议语义为供应商、Base URL、模型和 API Key。MiniMax 可作为默认推荐供应商，但实现不应硬编码真实 Key。

不引入重型 Agent 框架，也不强依赖供应商专用 SDK。优先使用 Node.js 原生 `fetch` 或轻量 HTTP 调用方式，以减少依赖和供应商锁定。

### 决策六：缺少真实 LLM 配置时启动提示，而不是静默失败

当配置选择真实 LLM Adapter 但缺少供应商、Base URL、模型或 API Key 时，系统启动应在命令行输出清晰提示。提示内容应告诉开发者需要配置哪些环境变量，但不得打印真实 Key。

如果使用测试替身或禁用真实 Agent 调用，则允许启动。这样既保护本地开发体验，也避免用户误以为真实 Agent 已可用。

### 决策七：输出校验保持通用，不校验具体果实或基因结构

本次 Output Validator 只做底层通用校验，如空结果、任务类型不匹配、不可用输出、错误包装等。果实候选结构、基因建议结构属于后续具体 Skill 和业务模块的校验范围。

这样可以避免底座提前固化尚未讨论完成的业务输出结构。

### 决策八：密钥保护作为实现任务的一部分

API Key 只能通过本地环境变量提供，`.env`、`.env.local` 等文件必须被 Git 忽略。示例配置只能写占位符，不得写真实 Key。测试不能断言或快照真实 Key。

该决策是安全边界，不是可选优化。

## Risks / Trade-offs

- 真实 LLM Adapter 提前接入可能让底座变复杂 → 将 LLM 访问封装在 Adapter 内，Runtime 和业务模块只依赖接口。
- 本次不做严格 Tool 授权，后续可能需要补强 → Tool 契约保留任务上下文参数，Tool Runtime 保持集中调用入口，方便后续加授权校验。
- 只做内存任务运行，不能恢复中断任务 → 当前变更只服务 Agent Core 验证；长耗时业务任务状态由后续领域模块设计。
- OpenAI API 兼容接口存在供应商差异 → Adapter 只依赖最小兼容字段，并将 Base URL、模型和供应商配置化。
- 缺少 API Key 时阻止真实调用可能影响本地开发 → 提供 Fake/Stub Adapter 用于测试和无 Key 开发。
- API Key 泄露风险 → 不写入仓库，补齐 ignore 和示例配置，并避免日志打印敏感值。
- Output Validator 过于通用，无法发现业务结构错误 → 业务结构校验留给后续具体 Skill 和领域服务。
