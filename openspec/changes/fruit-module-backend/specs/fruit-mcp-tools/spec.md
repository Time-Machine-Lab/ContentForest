## ADDED Requirements

### Requirement: Batch fruit save via MCP
The system SHALL expose a `save_fruits` MCP tool that accepts a batch of fruit objects in a single call, persists all of them atomically per user, and increments the seed's `fruitCount` by the number of fruits saved. Each fruit's `payload` SHALL be a plain Markdown string; `preview` SHALL be a separate structured object filled by the Agent at generation time.

#### Scenario: Agent saves multiple fruits at once
- **WHEN** Agent calls `save_fruits` with seedId, parentFruitId (optional), context, and a `fruits` array of 1-10 items where each item has `preview` (object) and `payload` (Markdown string)
- **THEN** system persists each fruit with a generated ID and status `generated`
- **AND** system stores `payload` as a verbatim Markdown string without parsing
- **AND** system increments `seed.fruitCount` by the count of fruits saved
- **AND** returns an array of `{ id, status }` for each saved fruit

#### Scenario: Agent saves fruit with platform-specific Markdown
- **WHEN** Agent calls `save_fruits` with a payload containing Markdown formatted for a specific platform (e.g., xiaohongshu post with emoji and line breaks)
- **THEN** system stores and returns the Markdown string verbatim
- **AND** system does NOT validate or transform the payload content

#### Scenario: save_fruits with invalid seedId
- **WHEN** Agent calls `save_fruits` with a seedId that does not exist under the current userId
- **THEN** system returns a MCP error with message indicating seed not found

### Requirement: Fruit context retrieval via MCP
The system SHALL expose a `get_fruit_context` MCP tool that returns the complete fruit object including all fields (id, status, preview, payload, context, mutation, parentFruitId, generation) for use by Agent in iteration or nutrient extraction workflows.

#### Scenario: Agent retrieves fruit for iteration
- **WHEN** Agent calls `get_fruit_context` with a valid fruitId
- **THEN** system returns the full fruit object including payload
- **AND** the response includes context.generatorId and context.nutrientsUsed for traceability

#### Scenario: Non-existent fruit returns error
- **WHEN** Agent calls `get_fruit_context` with a fruitId that does not exist
- **THEN** system returns a MCP error indicating the fruit was not found

### Requirement: Fruit status update via MCP
The system SHALL expose an `update_fruit_status` MCP tool that changes a fruit's status while enforcing the state machine transition rules. Invalid transitions SHALL return a MCP error.

#### Scenario: Agent marks fruit as rejected
- **WHEN** Agent calls `update_fruit_status` with fruitId and targetStatus `rejected` for a fruit currently `generated`
- **THEN** system transitions the fruit to `rejected` and returns `{ id, status: "rejected" }`

#### Scenario: Agent attempts invalid transition
- **WHEN** Agent calls `update_fruit_status` with targetStatus `picked` for a fruit currently `published`
- **THEN** system returns a MCP error describing the invalid transition

### Requirement: Quick pick via MCP
The system SHALL expose a `pick_fruit` MCP tool as a convenience shorthand for transitioning a fruit from `generated` to `picked`, enabling Agent auto-selection workflows without requiring `update_fruit_status`.

#### Scenario: Agent auto-picks best fruit after generation
- **WHEN** Agent calls `pick_fruit` with a valid fruitId in status `generated`
- **THEN** system transitions the fruit to `picked` and returns `{ id, status: "picked" }`

### Requirement: Compost fruit via MCP
The system SHALL expose a `compost_fruit` MCP tool that transitions a fruit to `rejected` status and provides an extension point for future negative-experience nutrient writing (reserved field `composSummary` in response, not yet implemented).

#### Scenario: Agent composts a low-quality fruit
- **WHEN** Agent calls `compost_fruit` with a valid fruitId in status `generated`
- **THEN** system transitions the fruit to `rejected`
- **AND** returns `{ id, status: "rejected", compostSummary: null }` (nutrient write is a future extension)
