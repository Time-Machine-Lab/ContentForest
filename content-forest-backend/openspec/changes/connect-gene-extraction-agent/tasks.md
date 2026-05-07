## 1. Contract Review

- [x] 1.1 Review `docs/api/gene.yaml` and confirm no API contract change is needed for this connection change.
- [x] 1.2 Review `docs/sql/gene.sql` and confirm no storage contract change is needed for this connection change.
- [x] 1.3 Record in implementation notes or tests that `polarity` and `similarityRelation` remain Markdown body content, not database meta.

## 2. Evidence Authorization

- [x] 2.1 Add or reuse a GeneService helper that resolves a fruit's root seed by walking its parent node chain.
- [x] 2.2 Validate `fruit_selected` and `fruit_eliminated` evidence belongs to the current seed before Agent input construction.
- [x] 2.3 Validate `publication` evidence by reading the publication record and checking its fruit belongs to the current seed.
- [x] 2.4 Return a validation error when any evidence source belongs to another seed or cannot be resolved.

## 3. Evidence Type Policy

- [x] 3.1 Define the current executable evidence source types for gene extraction as fruit selection, fruit elimination, and publication.
- [x] 3.2 Reject extraction requests whose evidence sources are only unsupported `feedback` evidence.
- [x] 3.3 Allow mixed evidence only when at least one executable evidence source is present.
- [x] 3.4 Ensure unsupported feedback evidence is not converted into fabricated feedback context.

## 4. Agent Input Contract

- [x] 4.1 Add a lightweight `contractVersion` or equivalent version marker to GeneService's `gene_extraction` Agent input.
- [x] 4.2 Ensure the Agent input still contains seedId, taskId, evidenceSources, fruitEvidence, and referableGeneInsights.
- [x] 4.3 Add tests that snapshot or assert the expected Agent input contract shape.

## 5. Agent Output Handling

- [x] 5.1 Ensure GeneService catches Agent success outputs that cannot be normalized into usable suggestions.
- [x] 5.2 Mark the extraction task as failed when Agent output normalization fails.
- [x] 5.3 Return a user-understandable failure reason for unusable Agent output.
- [x] 5.4 Preserve existing behavior for `ok = false` Agent results by marking the task failed with the Agent failure reason.

## 6. Runtime Integration Tests

- [x] 6.1 Add GeneService tests for authorized fruit evidence and unauthorized cross-seed fruit evidence.
- [x] 6.2 Add GeneService tests for authorized publication evidence and cross-seed publication rejection.
- [x] 6.3 Add GeneService tests for unsupported pure feedback evidence and mixed supported/unsupported evidence.
- [x] 6.4 Add GeneService tests for malformed successful AgentPort output becoming a failed extraction task.
- [x] 6.5 Add integration test using real AgentRuntime and registered gene extraction Skill to verify suggestions are persisted.

## 7. Verification

- [x] 7.1 Run `npm run typecheck`.
- [x] 7.2 Run `npm run lint`.
- [x] 7.3 Run `npm run test`.
- [x] 7.4 Run OpenSpec apply status for `connect-gene-extraction-agent` and confirm all tasks are complete.
