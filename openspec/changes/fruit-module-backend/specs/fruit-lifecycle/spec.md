## ADDED Requirements

### Requirement: Fruit entity storage
The system SHALL persist Fruit entities to Redis using the key pattern `cf:u:{userId}:fruit:{fruitId}` (Hash) and maintain a sorted index `cf:u:{userId}:seed:{seedId}:fruits` (ZSet, score=createdAt) for efficient per-seed queries.

#### Scenario: Save a new fruit
- **WHEN** Agent calls `save_fruits` MCP tool with a valid seedId and fruit payload
- **THEN** system stores each fruit as a Redis Hash under the user-scoped key
- **AND** system adds the fruitId to the seed's ZSet index with createdAt as score
- **AND** system atomically increments the seed's `fruitCount` field

#### Scenario: Query fruits by seed
- **WHEN** client sends `GET /api/seeds/:seedId/fruits` with a valid X-User-Id header
- **THEN** system returns all fruits belonging to that seed, ordered by createdAt descending
- **AND** response contains id, seedId, parentFruitId, generation, status, preview, payload, context, mutation fields

### Requirement: Fruit state machine
The system SHALL enforce the following state transitions and reject any invalid transition with HTTP 400 / MCP error:

```
generated → picked     (user picks fruit)
generated → rejected   (user composts fruit)
picked    → published  (user publishes, terminal state)
picked    → generated  (user revokes pick)
rejected  → generated  (user revokes compost)
published → [no transitions allowed]
```

#### Scenario: Valid state transition via HTTP
- **WHEN** client sends `PATCH /api/fruits/:fruitId/pickup` for a fruit with status `generated`
- **THEN** system updates the fruit status to `picked` and returns `{ code: 0, data: { id, status: "picked" } }`

#### Scenario: Invalid state transition rejected
- **WHEN** client sends `PATCH /api/fruits/:fruitId/pickup` for a fruit with status `published`
- **THEN** system returns HTTP 400 with a descriptive error message

#### Scenario: Publish fruit (terminal state)
- **WHEN** client sends `PATCH /api/fruits/:fruitId/publish` for a fruit with status `picked`
- **THEN** system updates status to `published` and returns the updated fruit
- **AND** no further status transitions are permitted for this fruit

#### Scenario: Compost fruit
- **WHEN** client sends `PATCH /api/fruits/:fruitId/compost` for a fruit with status `generated`
- **THEN** system updates status to `rejected` and returns `{ code: 0, data: { id, status: "rejected" } }`

#### Scenario: Revoke compost
- **WHEN** client sends a status update to `generated` for a fruit with status `rejected`
- **THEN** system accepts the transition and updates the status

### Requirement: In-place fruit pruning
The system SHALL allow users to directly edit the `payload` (Markdown string) and optionally `preview` fields of any fruit without creating a new iteration branch. The `payload` field is a plain Markdown string; the system SHALL store and return it verbatim without parsing or validating its structure.

#### Scenario: Prune fruit Markdown content
- **WHEN** client sends `PUT /api/fruits/:fruitId/payload` with an updated `payload` (Markdown string) and/or `preview` body
- **THEN** system overwrites the stored payload string and/or preview fields and updates `updatedAt`
- **AND** fruit status, generation, parentFruitId, and context remain unchanged

#### Scenario: Payload stored and returned verbatim
- **WHEN** Agent saves a fruit with a Markdown payload containing platform-specific formatting
- **THEN** system stores the string as-is and returns it unchanged on subsequent reads
- **AND** system does NOT attempt to parse, validate, or transform the Markdown content

### Requirement: User data isolation
The system SHALL enforce that all fruit operations are scoped to the authenticated user via the `X-User-Id` header, and SHALL reject requests that attempt to access fruits belonging to another user.

#### Scenario: User can only access own fruits
- **WHEN** client sends any fruit API request with X-User-Id header
- **THEN** system only reads/writes Redis keys scoped to that userId
- **AND** if the fruitId does not exist under that userId, system returns HTTP 404

#### Scenario: Missing user header rejected
- **WHEN** client sends a fruit API request without X-User-Id header
- **THEN** system returns HTTP 401 with message "X-User-Id header is required"

### Requirement: Fruit ID format
The system SHALL generate fruit IDs in the format `fruit_{YYYYMMDD}_{nanoid(8)}` to ensure global uniqueness and time-sortability.

#### Scenario: New fruit ID generation
- **WHEN** a new fruit is created via `save_fruits` MCP tool
- **THEN** each fruit receives a unique ID matching the pattern `fruit_YYYYMMDD_XXXXXXXX`
