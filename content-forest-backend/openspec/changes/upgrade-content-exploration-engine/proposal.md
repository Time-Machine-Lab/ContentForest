## Why

ContentForest already defines branch growth as searching for effective platform-specific expression routes, but the current implementation still falls back to a small fixed set of exploration slots such as pain resonance, utility value, contrarian angle, and story case. Those slots are too narrow for a product that must support many platforms and seed types, including product promotion, AI self-media, short drama scripts, comedy accounts, social polls, and future domains we cannot pre-enumerate.

This change upgrades exploration from fixed slot selection to a lightweight content solution-space model: the selected generator, user requirements, seed context, nutrients, genes, and feedback are used to infer platform and construct dynamic exploration routes before mutation and generation.

## What Changes

- Replace fixed exploration slots as the primary strategy mechanism with a dynamic content search map and attempt-level exploration routes.
- Keep existing search modes and mutation intensity as user-facing controls, but reinterpret them as route-selection breadth and mutation radius rather than hardcoded creative dimensions.
- Add platform inference priority for branch growth:
  1. selected generator and its methodology;
  2. explicit user requirements;
  3. system inference from seed, nutrients, genes, source node, and feedback.
- Add route metadata that can express objective, platform, audience, content form, narrative mechanism, emotional driver, interaction mode, conversion path, risk guards, mutation operators, evidence plan, and success signals.
- Add a reference plan that explains how user input, generator, source node, nutrients, temporary nutrient cards, genes, seed brief, and feedback should influence each route.
- Treat temporary nutrient cards as candidate evidence with lower confidence, not as formal settled nutrients.
- Preserve generator independence: generator management may expose or help infer hints from generator name, description, and Skill body, but must not require a ContentForest-specific manifest.
- Update top-level contracts before implementation where behavior or persisted/returned shape changes:
  - `docs/design/domain/枝化生长领域模块设计文档.md`
  - `docs/design/内容森林Agent架构设计文档.md`
  - `docs/design/domain/生成器领域模块设计文档.md`
  - `docs/内容森林第二期开发规划文档.md`
  - `docs/api/growth.yaml`
  - `docs/sql/growth.sql`
- No breaking API removal is intended. New fields should be additive or stored in existing JSON fields where appropriate.

## Capabilities

### New Capabilities

- None. This change upgrades the existing branch growth and content evolution strategy capabilities rather than introducing a separate domain.

### Modified Capabilities

- `content-evolution-strategy`: Replace fixed exploration-slot-first strategy requirements with solution-space modeling, platform inference, dynamic exploration routes, mutation operators, reference plans, and route traceability.
- `branch-growth-pipeline`: Extend the creative search layer to build and assign dynamic exploration routes per attempt, while preserving search mode and mutation intensity as lightweight controls.
- `branch-growth-agent-connection`: Pass route/search-map metadata and reference plans through AgentPort inputs without weakening authorization boundaries.
- `branch-growth-agent-skill`: Require the built-in growth Skill to consume dynamic routes and reference plans, generate according to the selected route, and report route-level trace metadata.
- `generator-management`: Clarify that generator data can be used as the highest-priority platform/methodology inference source without requiring generator manifests or making generator management responsible for branch-growth rules.

## Impact

- Affected code:
  - `src/modules/growth/application/growth-service.ts`
  - `src/modules/growth/domain/growth-types.ts`
  - `src/agent/skills/content-evolution-strategy.ts`
  - `src/agent/skills/branch-growth-skill.ts`
  - `src/agent/skills/branch-growth-structured-output.ts`
  - branch growth, skill, and growth integration tests
- Affected API/SQL contracts:
  - `docs/api/growth.yaml` should add or describe additive search-map, route, mutation-operator, and reference-plan fields where exposed in task detail or attempt metadata.
  - `docs/sql/growth.sql` should describe storage of selected route/search map metadata in existing JSON columns or additive JSON columns.
- Affected top-level design docs:
  - Branch growth and Agent architecture docs need terminology updates from fixed exploration slots to solution-space search routes.
  - Generator design needs platform inference wording while preserving generator independence.
- Dependencies:
  - No new external infrastructure, vector database, queue, auto-publishing service, or recommender platform is required.
