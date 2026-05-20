## Context

ContentForest 的顶层设计已经把枝化生长定义为六层管线：输入层、上下文补全层、创作搜索层、注意力编排层、生成执行层和结果封装层。当前系统已经能读取来源节点、用户输入、生成器 Skill、正式营养、未沉淀营养卡片和基因经验，也已经要求枝化生长 Skill 使用证据卡片和生长策略，避免把所有资料无差别拼接给模型。

但现有契约仍缺少一个关键中间层：当资料来源变得非常丰富时，系统不知道每份资料应该被“如何注意”。例如：

- 广告主 brief 可能包含事实、卖点、强制话术、禁用表达和主观宣传口径。
- 论文可能包含研究对象、条件、指标、结论和适用边界，不能直接变成营销承诺。
- 平台爆款案例可能提供结构、钩子、视觉节奏和评论语感，但不保证复制后有效。
- 正向基因适合继承、强化或组合；负向基因适合规避、反证或边界提醒。
- 未沉淀营养卡片可以快速试用，但语义上仍是候选资料，不等同于稳定营养。

`upgrade-content-exploration-engine` 已经在设计更大的解空间搜索模型，包括 `ContentSearchMap`、`ExplorationRoute`、mutation operators 和 route-level `ReferencePlan`。本变更不完成那套完整搜索引擎，只补上一个可以独立落地、也能被未来探索路线复用的 Reference Planner。

Reference Planner 属于枝化生长的策略编排能力，不属于营养库领域。营养库仍只负责资料组织、生命周期和可引用性；枝化生长负责在一次任务中解释这些资料如何被生成使用。

## Goals / Non-Goals

**Goals:**

- 将正式营养、未沉淀营养卡片、基因、来源节点、生成器方法论、用户输入、反馈和未来外部资料统一整理为可路由的参考原子。
- 明确区分约束权重和注意力权重：
  - 约束权重决定什么必须遵守、什么禁止使用、什么必须校验；
  - 注意力权重决定某个参考原子影响哪个内容槽位、以什么动作影响。
- 支持多平台、多内容形态和多资料类型，不把模型写死为小红书或单一图文平台。
- 对广告主资料、论文、平台案例、评论、爆款因素、宣传话术等资料做来源画像和可靠性校准。
- 为每个 attempt 形成可追踪的 `ReferencePlan`，说明计划参考了哪些原子、用于哪些槽位、边界是什么。
- 在候选果实结果中保留计划使用与实际使用摘要，帮助后续回答“本次提供的营养 Agent 参考了多少、如何参考”。
- 保持轻量落地，不引入向量数据库、复杂检索平台或新的独立服务。

**Non-Goals:**

- 不实现完整的 `upgrade-content-exploration-engine` 解空间搜索引擎。
- 不实现自动判断某条营养导致果实成功或失败的因果归因。
- 不把营养库改造成知识库或检索策略引擎。
- 不要求用户手动填写精确数字权重。
- 不要求生成器 Skill 增加 ContentForest 专用 manifest。
- 不让 Agent 直接写入营养库、果实、数据库或 Markdown 文件。

## Decisions

### Decision 1: Reference Planner 放在注意力编排层

Reference Planner 在枝化生长管线中位于创作搜索层之后、生成执行层之前。它接收本轮生长简报、用户输入、生成器方法论、授权资源、基因经验、反馈摘要，以及当前已有的 `mutationPlan`；如果未来 `ExplorationRoute` 可用，则优先消费 route 作为路由目标。

输出是 attempt 级 `ReferencePlan`，不是长期领域对象。它可以被写入 trace、attempt metadata 或 JSON 存储，但不单独建立领域聚合。

Alternative considered: 把 Reference Planner 做成营养库能力。Rejected because 营养库设计明确不负责 Agent 检索策略或生成决策；同一份营养在不同种子、生成器、平台和 attempt 中可能有完全不同用途。

### Decision 2: 用 ReferenceAtom 取代整份材料权重

每份授权材料先被拆为多个 `ReferenceAtom`。建议结构：

```ts
type ReferenceAtom = {
  id: string;
  sourceRef: {
    sourceType: 'user_input' | 'generator' | 'source_node' | 'formal_nutrient' | 'temporary_nutrient_card' | 'gene' | 'feedback' | 'research_context';
    sourceId?: string;
    title?: string;
  };
  atomType:
    | 'fact'
    | 'audience_signal'
    | 'platform_mechanic'
    | 'case_pattern'
    | 'language_asset'
    | 'structure_template'
    | 'visual_audio_asset'
    | 'trend_signal'
    | 'risk_constraint'
    | 'counterexample'
    | 'performance_signal'
    | 'claim_candidate'
    | 'conversion_asset'
    | 'brand_requirement';
  summary: string;
  evidenceStrength: 'confirmed' | 'observed' | 'candidate' | 'speculative';
  sourceBias: 'neutral' | 'self_reported' | 'promotional' | 'platform_observed' | 'system_inferred';
  allowedActions: ReferenceAction[];
  targetSlots: ContentSlot[];
  usageBoundary: string;
  forbiddenUses: string[];
  riskLevel: 'low' | 'medium' | 'high';
};
```

Atomization 的重点不是把长文机械切块，而是识别“这段信息能在生成中做什么”。同一份广告资料可以拆出产品事实、品牌强制要求、宣传候选卖点、禁用医疗化表达、CTA 信息和视觉资产；同一篇论文可以拆出研究对象、实验条件、指标结论、限制边界和允许转述表达。

Alternative considered: 为整份营养设置一个数值注意力权重。Rejected because 整份资料内部经常同时包含事实、偏见、禁用项、素材和风险，单一数字会掩盖用途差异。

### Decision 3: 约束门控优先于注意力路由

Reference Planner 先执行约束门控，再执行注意力路由。

约束门控处理：

- 用户明确要求和禁止项。
- 种子事实和来源节点核心语义。
- 生成器目标平台、格式和方法论边界。
- 授权范围和资源可读性。
- 法务、医疗、功效、广告、平台规则等风险边界。
- 负向基因或失败反馈中的禁用模式。

注意力路由处理：

- `ground`: 用于事实落地。
- `constrain`: 用于限制表达。
- `shape`: 用于结构和内容组织。
- `style`: 用于语气、话术、语言资产。
- `inherit`: 继承正向基因。
- `adapt`: 迁移某个案例模式到当前种子。
- `combine`: 组合多个原子形成新角度。
- `mutate`: 有边界地改变既有表达。
- `criticize`: 用反例或负反馈检查内容。
- `avoid`: 明确规避风险或失败模式。

Alternative considered: 直接把约束和注意力都写成 prompt 排序。Rejected because prompt 排序不可观察，也无法稳定回答为什么某条资料被用作事实、风格还是禁用边界。

### Decision 4: 注意力以内容槽位和动作表达

ReferencePlan 使用 slot-action matrix，而不是公共数字权重。

内容槽位建议包括：

- `title_hook`
- `opening`
- `audience_scenario`
- `body_structure`
- `script_or_shot`
- `visual_audio`
- `proof_evidence`
- `wording_style`
- `cta_conversion`
- `risk_review`
- `fact_check`

每条路由记录表达：哪个 atom，以什么 action，影响哪个 slot，优先级或置信语义是什么，使用边界是什么。例如：

```ts
type ReferenceRoute = {
  atomId: string;
  action: ReferenceAction;
  slot: ContentSlot;
  priority: 'must' | 'strong' | 'normal' | 'weak';
  instruction: string;
  boundary: string;
};
```

这里的 `priority` 不是用户可调的精确分数，而是帮助 Agent 执行的定性路由。最终呈现给用户时，可以解释为“作为硬约束”“作为标题参考”“作为证明素材”“作为风险检查”，而不是虚假的 37%/63%。

Alternative considered: 在 API 中暴露 0-100 权重。Rejected because 第一版缺少可校准的统计模型，数值会显得精确但不可靠。

### Decision 5: 对来源做可靠性校准

Reference Planner 必须识别资料来源的默认语义：

- 用户输入：通常是硬意图或硬约束，除非与安全、授权或种子事实冲突。
- 生成器：通常是平台、格式和方法论的高优先级约束。
- 来源节点和种子：通常是事实和语义核心约束。
- 正式营养：稳定参考，但仍需按内容类型拆分，不能自动视为事实真理。
- 未沉淀营养卡片：候选参考，默认低于正式营养，且不得自动沉淀。
- 广告主资料：产品、品牌和转化信息可作为强参考；功效、竞品、绝对化表述默认是 claim candidate 或 risk constraint。
- 论文和技术资料：只能在研究边界内转述，不能自动升级为广告承诺。
- 平台案例和评论：是观察信号或案例模式，不是效果保证。
- 正向基因：可继承、强化、组合或变异。
- 负向基因：可规避、反证或作为风险检查，不应全局禁止所有相似表达。

Alternative considered: 让模型自行判断来源可信度。Rejected because模型容易被宣传材料、权威语气和长文本位置影响，需要显式来源画像降低误用。

### Decision 6: 论文和广告材料使用 claim workflow

对于论文、白皮书、功效研究、广告主 brief 等高风险资料，Atomization 应额外产出 claim workflow：

1. 抽取原文结论或主张。
2. 标注主张类型：事实、观察、候选功效、品牌要求、禁用表达。
3. 标注证据边界：对象、样本、条件、指标、时间、适用人群、未覆盖范围。
4. 生成允许表达：保守转述、条件化描述、可感知体验描述。
5. 生成禁止表达：绝对化、医疗化、未证实因果、夸大承诺。
6. 在 `risk_review` 和 `fact_check` slot 中强制检查。

这能回答用户提出的美妆博主广告场景：广告商信息不是简单高权重素材，而是会被拆成品牌要求、产品事实、卖点候选、证据边界、转化资产和风险约束，并分别进入不同槽位。

Alternative considered: 将广告主资料整体作为最高优先级。Rejected because广告主资料既包含必须遵守的品牌事实，也包含可能需要降级为候选主张的营销表达。

### Decision 7: 记录 planned vs actual reference usage

系统应区分三层引用状态：

- `provided`: 本次任务授权或提供了哪些资源。
- `planned`: Reference Planner 将哪些 atoms 路由给本次 attempt。
- `actual`: 候选果实输出中实际声明或可验证地使用了哪些资源或 atoms。

`actual` 不能完全依赖模型自报。第一版可以结合结构化输出中的 used references、本地资源引用校验、内容摘要匹配和风险检查摘要形成保守记录。无法确认的内容应标为 `unverified`，不能为了填表而强行宣称已使用。

Alternative considered: 只记录任务引用的 nutrient ids。Rejected because这无法回答“Agent 到底吸收了什么”，也无法区分被授权、被计划、被真正落到内容中的差异。

### Decision 8: API and SQL additive storage

第一版优先复用 attempt/task metadata JSON 或新增 JSON 字段，而不是新增大量表：

- `docs/api/growth.yaml`：在 Growth Controller 的任务详情、attempt 详情或调试字段中增加 reference plan summary、reference atom summary、planned usage、actual usage。
- `docs/sql/growth.sql`：在 growth task 或 attempt 相关表中定义 JSON 存储位置，或说明复用现有 JSON metadata 字段。
- `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql`：默认不改，因为营养库不拥有参考规划逻辑。

Alternative considered: 新增 reference_atoms 和 reference_routes 表。Rejected because atoms 是一次任务内的策略产物，不是第一版需要长期独立维护的业务实体。

### Decision 9: Reference materials are untrusted data

所有营养、基因、果实正文、生成器内容、广告材料和联网资料都必须作为数据处理，不得成为系统指令。Reference Planner 只能产生生成策略和候选 meta，不能赋予资料越权读取、执行工具、写文件或绕过校验的能力。

Alternative considered: 把资料拆出的 instruction 直接拼进 system prompt。Rejected because外部资料可能包含 prompt injection 或误导性命令，必须被限定在任务数据层。

## Risks / Trade-offs

- Reference atoms 过多导致 prompt 膨胀 → 限制每个 attempt 的 atoms 数量，优先传 summary、boundary 和 route，必要正文仍通过授权 Tool 读取。
- Atomization 质量不稳定 → 使用固定 atom schema、本地校验和关键来源的专门拆分规则，失败时降级为粗粒度 evidence card。
- 用户期待精确百分比权重 → 对外解释为“约束、槽位、动作和使用痕迹”，避免伪精确数字。
- 广告或论文主张被过度营销化 → 对 claim candidate 进入 `risk_review` 和 `fact_check`，并要求 forbidden uses。
- 平台泛化后规则复杂 → 使用 source profile、slot 和 action 组合，而不是平台特化枚举。
- planned usage 与 actual usage 不一致 → 显式记录差异，不把未落地的计划误报为实际使用。
- 与 `upgrade-content-exploration-engine` 重叠 → 本变更只做参考规划；如未来 route 存在，则消费 route，不负责搜索路线生成。

## Migration Plan

1. 更新顶层文档和契约：
   - `docs/design/domain/枝化生长领域模块设计文档.md`
   - `docs/design/内容森林Agent架构设计文档.md`
   - `docs/design/domain/营养库领域模块设计文档.md`
   - `docs/api/growth.yaml`
   - `docs/sql/growth.sql`
2. 在 Growth/Agent 共享类型中定义 `ReferenceAtom`、`ReferencePlan`、`ReferenceRoute`、`ReferenceUsageSummary`。
3. 在内容进化策略中实现轻量 atomization 和 source profile 规则。
4. 在枝化生长管线中，在生成 attempt 前构建 attempt 级 ReferencePlan。
5. 在 AgentPort 输入中传递 reference plan summary，并保持授权资源边界。
6. 更新枝化生长 Skill prompt、结构化输出和本地校验，要求使用 slot-action 路由和风险边界。
7. 记录 provided/planned/actual 使用摘要，并接入 nutrient usage feedback。
8. 添加测试覆盖正式营养、临时卡片、广告 brief、论文、正负向基因和越权资源场景。

Rollback 策略：Reference Planner 是 additive strategy。若 atomization 或 planning 失败，系统可降级为当前 evidence card 与 mutation plan 行为，并在 trace 中记录 fallback reason。

## Open Questions

- 第一版 normal 用户界面是否展示 ReferencePlan，还是只在调试详情中展示摘要？
- actual usage 第一版是否只依赖结构化输出和本地引用校验，还是增加轻量内容匹配？
- 是否需要为常见资料类型提供可配置 source profile，还是先以代码内置规则落地？
- 是否要允许用户在发起生长时手动标记某份营养的默认用途，例如“只做风险参考”或“只做话术参考”？
