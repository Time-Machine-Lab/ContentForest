## 1. Contract Documents

- [x] 1.1 Update `docs/api/gene.yaml` so manual gene extraction task creation can carry optional user reason context and returned suggestions can expose evidence-driven explanation semantics.
- [x] 1.2 Update `docs/sql/gene.sql` to document how extraction reason context, Agent input, suggestion semantics, and evidence explanations are persisted or intentionally carried by existing JSON/Markdown columns.

## 2. Domain And Storage

- [x] 2.1 Extend gene domain types to represent optional extraction reason context, suggestion polarity, evidence explanation, and next-generation usage semantics.
- [x] 2.2 Update gene storage ports and in-memory storage to preserve the new reasoned input and suggestion semantics without breaking existing records.
- [x] 2.3 Update SQLite gene storage adapter to read and write the refined extraction task and suggestion data consistently with `docs/sql/gene.sql`.

## 3. Agent Connection And Skill

- [x] 3.1 Update `AgentPort` gene extraction input to include optional user reason context and a stable context version.
- [x] 3.2 Update gene extraction Agent input assembly so it passes user reason, evidence context, and referable genes to the Agent layer.
- [x] 3.3 Update the built-in gene extraction skill so generated suggestions consume the user reason and distinguish positive and negative gene semantics.
- [x] 3.4 Update gene extraction output validation and normalization so invalid or non-explainable suggestions fail cleanly.

## 4. HTTP Application Flow

- [x] 4.1 Update the gene controller request parsing for manual extraction task creation to accept optional reason input.
- [x] 4.2 Update gene service task creation and suggestion persistence so reasoned input and candidate-only semantics remain visible after refresh.
- [x] 4.3 Ensure confirmation still writes only user-confirmed suggestions into the formal gene library and never lets Agent output auto-confirm.

## 5. Tests And Verification

- [x] 5.1 Add or update service tests for extraction tasks created with and without user reason input.
- [x] 5.2 Add or update storage tests for persisting reason context and evidence-driven suggestion semantics.
- [x] 5.3 Add or update Agent skill and validator tests for positive/negative suggestions, evidence explanations, and next-generation usage text.
- [x] 5.4 Run the backend test suite relevant to gene extraction, Agent skill, storage, and controller behavior.
