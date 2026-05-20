## Why

Current branch growth can read nutrients, temporary nutrient cards, genes, source nodes, generator methods, and user input, but it still lacks a precise contract for how those heterogeneous materials should be converted into usable generation guidance. Treating each material as a large prompt block with a rough attention percentage makes advertiser briefs, papers, platform cases, wording assets, and genes easy to over-trust or misuse.

This change adds a lightweight Reference Planner inside branch growth: it decomposes authorized materials into reference atoms, separates hard constraints from routed attention, and records how each atom is intended to influence each fruit attempt.

## What Changes

- Add a Reference Planner strategy step to branch growth, implemented as an internal strategy artifact rather than a new domain module.
- Introduce `ReferenceAtom` semantics for heterogeneous sources such as formal nutrients, temporary nutrient cards, genes, source content, generator methodology, user input, advertiser briefs, research papers, platform rules, comments, cases, feedback, and future platform/domain data.
- Distinguish two kinds of influence:
  - constraint influence: hard requirements, forbidden uses, authorization limits, seed facts, generator format, compliance and safety boundaries;
  - attention influence: slot-level routing that tells the Agent which atom should ground, constrain, shape, style, inherit, adapt, combine, mutate, criticize, or avoid a specific content slot.
- Replace whole-material numeric weighting with qualitative, explainable routing metadata: atom type, source kind, evidence strength, bias, allowed actions, target slots, usage boundary, forbidden uses, and risk level.
- Require the planner to treat temporary nutrient cards, advertiser claims, incomplete platform evidence, and generated research summaries as candidate evidence unless stronger provenance is available.
- Require research papers and technical evidence to be atomized with boundaries, such as study object, condition, intervention, metric, conclusion, evidence strength, applicability, allowed expression, and forbidden claim.
- Allow the Reference Planner to consume the existing `mutationPlan` now and a future `ExplorationRoute` from `upgrade-content-exploration-engine` when available, without duplicating that broader solution-space search change.
- Add planned-vs-actual reference usage trace so later analysis can answer which nutrients or atoms were provided, which were routed, and which were actually reflected in a candidate fruit.
- Update top-level contracts before implementation where persisted or returned shape changes:
  - `docs/design/domain/枝化生长领域模块设计文档.md`
  - `docs/design/内容森林Agent架构设计文档.md`
  - `docs/design/domain/营养库领域模块设计文档.md`
  - `docs/api/growth.yaml`
  - `docs/sql/growth.sql`
- No breaking API removal is intended. New fields should be additive or stored in existing JSON fields where appropriate.

## Capabilities

### New Capabilities

- None. This change upgrades existing branch growth, Agent Skill, and nutrient usage capabilities rather than introducing a separate domain.

### Modified Capabilities

- `content-evolution-strategy`: Add reference atomization, constraint-vs-attention semantics, source reliability handling, and reference routing as part of the growth strategy model.
- `branch-growth-pipeline`: Add a reference planning step in the attention orchestration layer and pass planned reference usage into each fruit generation attempt.
- `branch-growth-agent-connection`: Extend AgentPort growth input and trace semantics to carry reference atoms, reference plans, and planned/actual usage summaries while preserving authorization boundaries.
- `branch-growth-agent-skill`: Require the built-in growth Skill to use ReferencePlan guidance instead of indiscriminate context concatenation, and to validate risky claims against atom boundaries.
- `nutrient-usage-feedback`: Extend nutrient usage tracking from "resource was authorized/used" toward planned-vs-actual reference usage summaries without claiming causal performance impact.

## Impact

- Affected code:
  - `src/modules/growth/application/growth-service.ts`
  - `src/modules/growth/domain/growth-types.ts`
  - `src/agent/skills/content-evolution-strategy.ts`
  - `src/agent/skills/branch-growth-skill.ts`
  - `src/agent/skills/branch-growth-structured-output.ts`
  - branch growth, Agent Skill, and nutrient usage tests
- Affected API/SQL contracts:
  - `docs/api/growth.yaml` should add or describe additive reference-plan, reference-atom summary, and planned/actual usage fields where exposed in task detail or attempt metadata.
  - `docs/sql/growth.sql` should describe storage of reference planning metadata in existing JSON columns or additive JSON columns.
  - `docs/api/nutrient.yaml` and `docs/sql/nutrient.sql` are not expected to change unless a later implementation chooses to expose nutrient analytics through Nutrient Controller.
- Affected top-level design docs:
  - Branch growth design should clarify Reference Planner ownership in the attention orchestration layer.
  - Agent architecture should clarify that reference materials are untrusted data, not executable instructions.
  - Nutrient library design should clarify that nutrient atomization is a branch-growth usage strategy and does not make the nutrient library responsible for retrieval or generation decisions.
- Dependencies:
  - No new external infrastructure, vector database, queue, crawler, auto-publishing service, or recommender platform is required.
