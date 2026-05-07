## Why

The branch growth domain and the built-in branch growth Agent skill now exist, but the growth request still needs a clear execution contract for connecting user-facing growth tasks to Agent attempts. This change makes branch growth behave like the workbench expects: create a running task immediately, let the backend execute Agent-backed fruit attempts, and let the frontend poll task/source status while fruits land under the selected node.

## What Changes

- Connect branch growth execution to `AgentPort` using the built-in `growth` task type and the branch growth candidate output contract.
- Change branch growth task start behavior so the API returns a running task immediately instead of waiting for all Agent attempts to finish.
- Execute each requested fruit as an independent backend attempt, passing `target.fruitCount = 1` to Agent for each attempt.
- Keep Growth responsible for task state, source-node growth lock, attempt records, retry input, and FruitService landing.
- Keep Agent responsible for reading authorized context through tools and returning structured candidate fruit output.
- Preserve the existing rule that a task completes when at least one fruit is created, fails only when no fruit is created, and never rolls back already created fruits.
- Keep nutrient/gene resource reading out of Growth implementation; Growth only passes authorized resource references to Agent.
- No breaking API shape changes are intended, but the timing semantics of task creation change from blocking execution to asynchronous execution.

## Capabilities

### New Capabilities
- `branch-growth-agent-connection`: Covers asynchronous branch growth execution, AgentPort input/output handoff, attempt processing, source growth status, and polling-friendly task updates.

### Modified Capabilities
- None.

## Impact

- Affected backend modules: growth application service, growth controller/API behavior, growth storage adapter, app bootstrap wiring, and tests.
- Affected integration boundary: `GrowthService -> AgentPort.runTask(type="growth") -> BranchGrowthSkill -> candidate fruit -> FruitService`.
- API documentation under `docs/api/` should be updated if endpoint timing or response semantics are documented there.
- SQL/storage documentation under `docs/sql/` should be updated if task execution bookkeeping requires schema changes.
- No new external dependency is required.
