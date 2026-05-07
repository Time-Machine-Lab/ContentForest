## Context

Branch growth is the domain bridge between the workbench interaction and content tree expansion. The completed `add-branch-growth-module` change already provides growth task state, source-node locks, attempts, retry input, and FruitService landing. The completed `add-branch-growth-agent-skill` change already provides the built-in Agent skill and structured candidate fruit output.

The remaining mismatch is runtime behavior. The workbench expects a growth request to create visible running state immediately, then poll the task/source while the backend generates fruits. The current service shape is closer to blocking execution: task creation and Agent attempts happen before the request returns. This change connects Growth to Agent in a polling-friendly way while preserving the domain boundary described in `docs/design/domain/枝化生长领域模块设计文档.md` and `docs/design/内容森林Agent架构设计文档.md`.

## Goals / Non-Goals

**Goals:**

- Make branch growth task creation return a `running` task immediately.
- Execute Agent-backed fruit attempts after task creation without requiring the HTTP request to wait for completion.
- Keep one Agent call responsible for one candidate fruit, even when the user requests multiple fruits.
- Preserve source-node growth locks until the backend execution finishes.
- Persist attempt progress so the frontend can poll `GET /api/growth-tasks/{taskId}` and source status.
- Keep Growth responsible for system facts and FruitService landing.
- Keep Agent responsible for context reading through tools and candidate fruit generation.
- Update `docs/api/growth.yaml` if the endpoint timing semantics are implemented.

**Non-Goals:**

- Do not implement Agent tools for nutrient content reading in Growth.
- Do not change the branch growth Agent skill contract.
- Do not introduce a general-purpose job queue, distributed worker, or scheduler.
- Do not add automatic retry, priority, cancellation, or parallel attempt controls in phase one.
- Do not change generator Skill behavior or let generators create fruits directly.
- Do not add new database tables unless implementation discovers an unavoidable persistence gap.

## Decisions

### Decision 1: Use a lightweight in-process executor

Growth task creation will persist the running task and acquire the source-node lock, then hand execution to a lightweight backend executor. The executor may run in-process for phase one and call the existing Growth application logic to process attempts.

Alternative considered: keep the current blocking call. This is simpler, but it does not match workbench polling and can keep HTTP requests open during long LLM calls.

Alternative considered: introduce a real queue. This is more robust, but it is too heavy for phase one and would turn branch growth into a generic task system.

### Decision 2: Keep attempt granularity as one Agent call per fruit

When `fruitCount` is greater than one, Growth will create/process multiple attempts. Each attempt calls `AgentPort.runTask` with `type = "growth"` and `target.fruitCount = 1`. This keeps partial success simple and avoids asking Agent to return a batch format.

Alternative considered: one Agent call returns multiple fruits. This reduces LLM calls, but it complicates partial failure, validation, and fruit landing.

### Decision 3: Keep Growth as the landing authority

Agent output remains a candidate fruit structure. Growth validates the candidate against the authorized resource scope and calls FruitService to create the actual fruit under the selected source node. Agent never writes files, updates task status, releases locks, or calls FruitService.

Alternative considered: let the branch growth Agent skill call FruitService. This breaks the established boundary that system facts belong to Content Forest, not Agent.

### Decision 4: Polling uses existing task and source status reads

The frontend should poll the task detail endpoint for attempts and successful fruit IDs, and poll source status when it only needs to know whether a node is locked. No push channel is introduced in this change.

Alternative considered: use SSE/WebSocket. This would improve latency, but it increases frontend/backend complexity before the phase-one workflow needs it.

### Decision 5: Locks stay tied to execution completion

The source-node growth lock must remain active after the create request returns and only be released after the background execution reaches completed or failed. If execution crashes, recovery is not solved by a full queue in this change; implementation should avoid leaving locks unreleased in normal handled failures.

Alternative considered: release lock immediately after task creation. This would allow duplicate growth from the same source node while an Agent task is still running, which violates the domain model.

### Decision 6: Documentation follows existing single-file ownership

If API behavior is updated, the change belongs in `docs/api/growth.yaml`. If storage structure changes, the change belongs in `docs/sql/growth.sql`. Current tables already cover the expected state, so SQL changes are not planned.

## Risks / Trade-offs

- [Risk] In-process execution can be interrupted if the Node process exits while a task is running. → Mitigation: keep phase-one scope lightweight, persist task/attempt progress, and leave durable queue recovery for a later change.
- [Risk] Starting execution after returning the response can hide immediate Agent errors from the initial request. → Mitigation: expose failures through task polling and preserve failed input for retry.
- [Risk] Multiple fruit attempts can take longer because each fruit is a separate Agent call. → Mitigation: preserve correctness and partial success first; optimize batching later if needed.
- [Risk] Background execution errors could leave source locks active. → Mitigation: centralize execution finalization so normal success/failure paths always release the lock.
- [Risk] API timing semantics change even if the response schema does not. → Mitigation: update `docs/api/growth.yaml` wording and tests to assert the running response.
