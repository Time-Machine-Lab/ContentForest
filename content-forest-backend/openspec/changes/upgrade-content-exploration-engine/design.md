## Context

Existing top-level docs already describe branch growth as a six-layer pipeline where the creative search layer dynamically discovers directions from seed, source node, user input, seed brief, nutrients, and genes. The current implementation partially follows this with `searchMode`, `mutationIntensity`, and attempt-level `mutationPlan`, but the built-in content evolution strategy still has a fixed fallback list of exploration slots:

- 痛点共鸣
- 工具价值
- 反常识观点
- 案例故事
- 负反馈规避
- 平台路由

Those slots are useful examples, but they are not a sufficient model for ContentForest's target scope. A seed may be an AI product launch, a Bilibili knowledge account, a Douyin martial-arts short drama, a comedy persona, a Reddit discussion starter, or a cross-platform campaign. The system needs to search across objective, platform, audience, content form, narrative mechanism, emotional driver, interaction mode, conversion path, evidence, risk, and feedback dimensions.

The relevant current anchors are:

- `docs/内容森林第二期开发规划文档.md`: explicitly says mutation direction must be dynamically generated rather than fixed dimensions.
- `docs/design/domain/枝化生长领域模块设计文档.md`: defines growth strategy, search mode, mutation intensity, mutation plan, evidence card, and exploration slot.
- `docs/design/内容森林Agent架构设计文档.md`: defines AgentPort, controlled resource reading, built-in growth Skill, generator Skill boundaries, and trace rules.
- `docs/design/domain/生成器领域模块设计文档.md`: keeps generator Skill independent and not required to contain a ContentForest-specific manifest.
- `docs/api/growth.yaml` and `docs/sql/growth.sql`: currently expose/store search mode, mutation intensity, and mutation plan, but not search-map or route metadata.

## Goals / Non-Goals

**Goals:**

- Model exploration as lightweight content solution-space search, not fixed slot rotation.
- Infer platform and content form in the order: selected generator, explicit user requirement, then system inference.
- Generate multiple candidate exploration routes and assign one selected route to each fruit attempt.
- Distinguish exploration from mutation:
  - exploration chooses where in the solution space to search;
  - mutation changes variables within or across selected routes.
- Make reference usage explainable through a route-level reference plan.
- Treat temporary nutrient cards as candidate evidence with lower confidence than settled nutrients.
- Keep the model lightweight and compatible with current Agent Runtime, Tool, Skill, Trace, and Growth storage boundaries.
- Update top-level design/API/SQL docs before code implementation changes.

**Non-Goals:**

- No vector database, embedding retrieval platform, independent experiment platform, or auto-publishing system.
- No user-facing numeric scoring panel or hidden promise of finding the optimal route.
- No requirement that generators include `generator.json` or any ContentForest-specific manifest.
- No automatic rewrite of generator Skills.
- No automatic confirmation of genes or settled nutrients.
- No cross-seed global content recommender.

## Decisions

### Decision 1: Add a `ContentSearchMap` as an internal strategy artifact

The creative search layer should build a transient search map for each growth task.

```text
Seed / Source / User Input / Generator / Nutrients / Genes / Feedback
        |
        v
ContentSearchMap
        |
        +-- inferredPlatform
        +-- objective candidates
        +-- audience candidates
        +-- content form candidates
        +-- narrative and emotional dimensions
        +-- evidence inventory
        +-- risk guards
        +-- route candidates
```

This map is not a new domain aggregate and does not need independent persistence. It can be carried in Agent input, attempt metadata, trace, or existing/additive JSON storage.

Alternative considered: keep adding more fixed slots. Rejected because any fixed list quickly becomes platform- and domain-biased. It cannot cover short drama, beauty, debate, product conversion, community voting, and comedy accounts equally well.

### Decision 2: Use platform inference as a first-class step

Platform inference should follow this priority:

1. selected generator and generator methodology;
2. explicit user requirements;
3. system inference from seed, source node, nutrients, genes, feedback, and known platform vocabulary.

The selected generator is highest priority because branch growth usually runs through a platform-specific or format-specific generator. Generator management remains independent: it only provides name, description, content location, and Skill body for inference. It does not own growth rules.

Alternative considered: ask users to always select platform explicitly. Rejected because it adds friction and ignores the fact that generator choice often already encodes platform and format.

### Decision 3: Replace `explorationSlot` as primary strategy with `ExplorationRoute`

Each attempt should receive a selected route. A route should be expressive enough for many content domains:

```ts
type ExplorationRoute = {
  id: string;
  objective: string;
  platforms: string[];
  audience: string;
  contentForm: string;
  narrativeMechanism: string;
  emotionalDrivers: string[];
  evidencePlan: string[];
  interactionMode: string;
  conversionPath?: string;
  riskGuards: string[];
  mutationOperators: string[];
  successSignals: string[];
};
```

`explorationSlot` may remain as a compatibility summary or fallback, but it should be derived from route metadata when possible. Fixed slots are fallback examples, not the core algorithm.

Alternative considered: directly expand `mutationPlan.direction` as a longer string. Rejected because a single string cannot reliably express platform, form, audience, evidence, risk, and success signals for trace and future evaluation.

### Decision 4: Make route selection quality-and-diversity based, but lightweight

The first version should not implement a complex optimizer. It should:

- generate more candidate routes than requested fruit count when possible;
- filter routes that violate seed facts, user constraints, generator format, or risk guards;
- select routes that are both plausible and diverse across objective/platform/form/audience/narrative dimensions;
- assign one route per attempt.

This borrows the product intuition of quality-diversity search without requiring a mathematical framework in the first implementation.

Alternative considered: use random sampling with temperature. Rejected because it does not create explainable or inspectable route diversity.

### Decision 5: Introduce `ReferencePlan` instead of implicit context weight

The system should not rely on vague prompt ordering to decide how much each resource matters. A route should carry a qualitative reference plan:

- user input: hard constraint or intent driver;
- generator: platform/form/methodology driver;
- source node: seed/core semantic constraint;
- seed brief: strategic background and candidate directions;
- settled nutrients: evidence and platform/case constraints;
- temporary nutrient cards: candidate evidence, lower confidence;
- genes: inherit, strengthen, combine, mutate, or avoid;
- feedback: avoid or reinforce based on context.

This can be represented as text or structured records in the strategy artifact. It does not require numeric weights in the public API.

Alternative considered: expose numeric weights. Rejected for now because numeric values imply precision the system does not yet have and would burden users with algorithm details.

### Decision 6: Store and expose route metadata additively

API and SQL should stay backward-compatible. The preferred first implementation is:

- update `docs/api/growth.yaml` with additive schemas for search map summary, selected route, mutation operators, and reference plan in task/attempt detail where needed;
- update `docs/sql/growth.sql` to document storing selected route/search-map metadata in existing JSON columns or additive JSON columns;
- keep existing `searchMode`, `mutationIntensity`, and `mutationPlan` fields.

Alternative considered: introduce dedicated route tables immediately. Rejected because the first version only needs task/attempt-scoped traceable strategy artifacts, not long-lived route entities.

### Decision 7: Keep Agent output bounded

The built-in branch growth Skill should receive search map and selected route metadata, but the generator still produces only payload. Candidate fruit output may include route summary, route id, mutation operators, used resources, warnings, and gene tags as candidate meta. Growth service remains responsible for final validation and landing.

Alternative considered: make generator Skills output complete route-aware fruit meta. Rejected because it breaks generator independence and repeats ContentForest-specific rules in every external generator.

## Risks / Trade-offs

- More route metadata can make prompts larger → cap route and evidence summaries, pass full content through existing controlled tools only when authorized.
- Platform inference may be wrong → record inference source and confidence, allow user explicit platform/user input to override system inference, and keep generator-derived hints highest priority only when generator evidence is clear.
- Dynamic routes may become generic strategy prose → require each selected route to include objective, content form, audience, evidence plan, risk guards, mutation operators, and success signals.
- Route diversity may conflict with generator format → route filtering must preserve generator method and target format as hard constraints.
- Temporary nutrient cards may be overtrusted → mark them as candidate evidence and lower confidence in reference plans and evidence cards.
- Backward compatibility with existing logs/tests → keep `searchMode`, `mutationIntensity`, `mutationPlan`, and optional `explorationSlot` compatibility summaries during migration.

## Migration Plan

1. Update top-level docs and contracts:
   - `docs/内容森林第二期开发规划文档.md`
   - `docs/design/domain/枝化生长领域模块设计文档.md`
   - `docs/design/内容森林Agent架构设计文档.md`
   - `docs/design/domain/生成器领域模块设计文档.md`
   - `docs/api/growth.yaml`
   - `docs/sql/growth.sql`
2. Add route/search-map/reference-plan types to Growth and Agent input structures.
3. Upgrade mutation planning to build candidate exploration routes before per-attempt mutation plans.
4. Upgrade `content-evolution-strategy.ts` to use selected route metadata as primary strategy input and keep fixed slots only as fallback.
5. Upgrade branch growth Skill prompt/context/trace to include route metadata and route-level reference plans.
6. Add tests for platform inference priority, route diversity, temporary card evidence confidence, fallback behavior, and backward compatibility.

Rollback is straightforward because the first implementation is additive: if route generation fails, the system can fall back to the current mutation plan and compatibility exploration slot behavior while recording the fallback reason in trace.

## Open Questions

- Should route metadata be visible in normal fruit detail, or only in task/attempt debug trace for the first version?
- Should generator import optionally derive and store cached generator hints, or should inference read generator Skill body at growth time only?
- Should route success signals feed directly into future gene extraction prompts in this change, or wait for a later feedback/evaluation change?
