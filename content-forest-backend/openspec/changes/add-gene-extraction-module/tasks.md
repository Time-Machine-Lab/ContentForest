## 1. Top-Level Contracts

- [ ] 1.1 Create `docs/api/gene.yaml` for gene library, extraction reminder, extraction task, suggestion, and confirmed insight APIs.
- [ ] 1.2 Create `docs/sql/gene.sql` for gene extraction persistence contracts, including gene library, reminder, task, suggestion, insight, and evidence-related storage.
- [ ] 1.3 Review gene API and SQL contracts against `docs/api/` and `docs/sql/` conventions so subsequent code can align with them.

## 2. Domain Model

- [ ] 2.1 Create the gene module structure under `src/modules/gene`.
- [ ] 2.2 Define gene domain types for seed-scoped gene library, extraction reminder, extraction task, gene suggestion, confirmed gene insight, evidence source, lineage, niche, and lifecycle states.
- [ ] 2.3 Define domain validation rules for suggestion confirmation, suggestion dismissal, insight archive, evidence requirements, and seed ownership boundaries.
- [ ] 2.4 Export gene module domain types through the module public entrypoint.

## 3. Storage Layer

- [ ] 3.1 Define a gene storage port for preparing gene libraries and persisting reminders, tasks, suggestions, insights, and evidence relationships.
- [ ] 3.2 Implement an in-memory gene storage adapter for service tests.
- [ ] 3.3 Implement the SQLite gene storage adapter aligned with `docs/sql/gene.sql`.
- [ ] 3.4 Add the SQLite migration or schema registration needed by the gene storage adapter.
- [ ] 3.5 Add storage adapter tests for reminder state transitions, task state transitions, suggestion lifecycle, insight archive behavior, and seed-scoped queries.

## 4. Content Access

- [ ] 4.1 Define a gene content access port for confirmed gene insight Markdown reads and writes.
- [ ] 4.2 Implement a local filesystem gene content adapter using the runtime seed-scoped gene library location.
- [ ] 4.3 Implement an in-memory gene content adapter for service tests.
- [ ] 4.4 Add content access tests for writing, reading, editing, and preserving Markdown body content without treating Markdown as meta.

## 5. Application Service

- [ ] 5.1 Implement gene library preparation for a seed without writing gene experience content.
- [ ] 5.2 Implement extraction reminder creation from fruit selection and fruit elimination evidence.
- [ ] 5.3 Implement extraction reminder listing, handled marking, and ignored marking.
- [ ] 5.4 Implement gene extraction task creation from explicit seed and evidence sources.
- [ ] 5.5 Build the gene extraction Agent input from seed ownership, evidence sources, fruit meta, fruit content locations, and existing referable gene insights.
- [ ] 5.6 Connect gene extraction task execution to the external Agent gene extraction entrypoint through `AgentPort`.
- [ ] 5.7 Validate and normalize the Agent gene extraction output into pending gene suggestions.
- [ ] 5.8 Persist Agent-generated gene suggestions as database drafts without creating Markdown files.
- [ ] 5.9 Implement suggestion listing, detail retrieval, editing, dismissal, and confirmation.
- [ ] 5.10 Implement confirmation from suggestion to formal gene insight, including Markdown write and meta persistence.
- [ ] 5.11 Implement formal gene insight detail retrieval, listing, editing, archiving, and seed-scoped referable insight querying.
- [ ] 5.12 Implement failure handling so Agent errors mark the extraction task as failed and return a user-understandable reason.

## 6. Agent Integration Contract

- [ ] 6.1 Document the gene module's required Agent input shape in the implementation notes or contract docs used by this change.
- [ ] 6.2 Document the Agent output shape that the gene module accepts for gene suggestions, lineage suggestions, niche suggestions, and evidence interpretation.
- [ ] 6.3 Add a test double for `AgentPort` that returns valid gene extraction output for gene service tests.
- [ ] 6.4 Add a test double for `AgentPort` failure output to verify failed extraction task handling.
- [ ] 6.5 Do not implement Agent tools, built-in Agent skills, or Agent entrypoint registration in this change; those are provided by the parallel Agent task.

## 7. HTTP Interface

- [ ] 7.1 Create `src/interface/http/gene-controller` aligned with `docs/api/gene.yaml`.
- [ ] 7.2 Wire gene controller routes into the backend HTTP assembly.
- [ ] 7.3 Ensure API responses keep Markdown body content separate from database-maintained meta.
- [ ] 7.4 Add HTTP integration tests for reminders, extraction tasks, suggestions, confirmations, insight reads, edits, archives, and referable insight queries.

## 8. Cross-Module Integration

- [ ] 8.1 Wire seed creation flow or application assembly to prepare a seed-scoped gene library.
- [ ] 8.2 Wire fruit selection and elimination flows to create lightweight extraction reminders without automatically running Agent.
- [ ] 8.3 Ensure archived gene insights are excluded from branch growth gene-reference queries.
- [ ] 8.4 Keep gene extraction independent from nutrient library writes and generator mutation.

## 9. Verification

- [ ] 9.1 Add gene application service tests covering success, validation failure, Agent failure, retry-relevant failed task state, and no-hard-delete behavior.
- [ ] 9.2 Add contract-alignment checks or review notes verifying implementation matches `docs/api/gene.yaml` and `docs/sql/gene.sql`.
- [ ] 9.3 Run backend unit and integration tests relevant to seed, fruit, Agent runtime, and gene modules.
- [ ] 9.4 Run OpenSpec status validation for `add-gene-extraction-module` and confirm the change is ready for implementation.
