## Why

当前枝化生长已经能把种子、果实、生成器、营养和基因交给 Agent 生成内容，但多源资料进入生成过程时缺少明确的选择、加权、差异化和反馈调节机制。生成出的果实更像多次 Prompt 采样，而不是围绕平台传播目标进行可迭代搜索。

内容森林的核心目标是找到某个内容在不同平台上的最优传播方法论和爆款因子，因此需要把“生成内容”升级为“内容进化搜索”：每轮生长都基于可解释的策略、证据、基因假设和反馈信号生成下一代果实，同时允许这套算法模型本身持续迭代，而不是被一次设计锁死。

## What Changes

- 引入“内容进化算法模型”的轻量架构概念，明确它是可版本化、可替换、可迭代的策略模型，而非固定爆款公式。
- 在枝化生长前增加“生长策略编排”语义：基于来源节点、用户输入、生成器、营养、基因和历史反馈，形成本轮每个果实生成尝试的策略任务书。
- 将多果实生成从“同一上下文重复生成”优化为“批量差异化探索”，每个 attempt SHOULD 具备明确的变体方向、使用证据、继承基因、规避基因和目标假设。
- 强化生成器与数据源的协作边界：生成器仍负责平台/内容类型方法论，策略编排负责决定哪些资料、哪些基因、哪些反馈以何种优先级影响本次生成。
- 将“基因”从简单标签升级为“可复用的内容表达特征假设”，必须能表达适用上下文、证据来源、正/负方向、置信度或强度语义，并能被下一轮生长继承、变异、组合或规避。
- 优化基因汲取：基因建议不只是总结文本，而是围绕内容表现、选择/淘汰、发布反馈和平台目标提取可验证的成功因子、失败因子和下一轮生成建议。
- 明确本轮不实现重型自动化算法系统：不引入向量数据库、复杂多臂老虎机服务、自动 A/B 平台、自动改写生成器或全自动沉淀；先以轻量、可观测、可替换的策略层落地。
- 同步修正顶层文档中“第一期不做复杂遗传算法/多目标适应度模型”的表述，将其调整为“不做重型算法基础设施，但建立可迭代的轻量内容进化策略框架”。

## Capabilities

### New Capabilities

- `content-evolution-strategy`: 定义可迭代的内容进化算法模型，包括生长策略、证据选择、基因假设、反馈调节和算法版本边界。

### Modified Capabilities

- `branch-growth`: 枝化生长需要在调用 Agent 生成果实前形成 attempt 级生长策略，并保证批量果实具备可解释的差异化探索方向。
- `branch-growth-agent-skill`: 内置枝化生长 Skill 需要支持策略编排、证据卡片组织、生成器 payload 约束、候选果实结构化和生成痕迹清理。
- `gene-extraction`: 基因汲取需要将基因定义为带证据、生态位和方向性的内容表达特征假设，而不是仅保存泛化标签。
- `gene-extraction-agent-skill`: 内置基因汲取 Skill 需要输出可确认、可复用、可用于下一轮生长的基因假设建议，并区分成功因子、失败因子和下一轮建议。
- `agent-core-runtime`: Agent Runtime 需要保留算法模型版本、策略编排阶段和关键 LLM/Tool 阶段的可观测性，以支持后续算法迭代排查。

## Impact

- Affected docs: `docs/内容森林概念设计文档.md`, `docs/内容森林第一期开发规划文档.md`, `docs/design/内容森林架构设计文档.md`, `docs/design/内容森林Agent架构设计文档.md`, `docs/design/domain/枝化生长领域模块设计文档.md`, `docs/design/domain/基因汲取领域模块设计文档.md`.
- Affected backend modules: branch growth service/Agent input assembly, built-in branch growth skill, branch growth structured output, gene extraction skill, Agent trace/exchange log metadata, and related tests.
- API impact: no public API contract change is planned for this change. Existing growth and gene endpoints should keep their request/response shape unless a later separate change explicitly updates `docs/api/*.yaml`.
- SQL impact: no database schema change is planned for this change. Strategy artifacts and algorithm traces should initially live in Agent task input/output, attempt records, existing gene suggestion/insight content, and logs where possible.
- Dependency impact: no new external infrastructure dependency is planned. This change should not require vector database, message queue, external experiment platform, or additional SaaS service.
