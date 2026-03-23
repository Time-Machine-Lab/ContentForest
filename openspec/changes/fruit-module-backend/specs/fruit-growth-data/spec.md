## ADDED Requirements

### Requirement: Growth data independent storage
The system SHALL store `FruitGrowthData` as a separate Redis Hash under key `cf:u:{userId}:fruit:{fruitId}:growth`, decoupled from the Fruit entity, so that the monitoring domain can operate independently.

#### Scenario: Get growth data when none exists
- **WHEN** client sends `GET /api/fruits/:fruitId/metrics` and no growth data has been recorded
- **THEN** system returns `{ code: 0, data: { fruitId, platform, collectedAt: null, metrics: [] } }`

#### Scenario: Get growth data when data exists
- **WHEN** client sends `GET /api/fruits/:fruitId/metrics` and growth data exists
- **THEN** system returns the stored `FruitGrowthData` including fruitId, platform, collectedAt, and metrics array

### Requirement: Growth data write and overwrite
The system SHALL allow clients to submit a complete `MetricsField[]` array that fully replaces the stored metrics for a fruit. Each `MetricsField` SHALL contain key, value, label, and description.

#### Scenario: Update growth data
- **WHEN** client sends `PUT /api/fruits/:fruitId/metrics` with a valid metrics array
- **THEN** system overwrites the stored metrics and updates `collectedAt` to the current timestamp
- **AND** returns `{ code: 0, data: { success: true } }`

#### Scenario: Invalid metrics payload rejected
- **WHEN** client sends `PUT /api/fruits/:fruitId/metrics` with a metrics entry missing required fields (key, value, label, description)
- **THEN** system returns HTTP 400 with a validation error message

### Requirement: Schema-on-read metrics model
The system SHALL NOT validate or restrict the `key` values within `MetricsField`. Any string key SHALL be accepted, enabling platform-specific and custom metrics without schema changes.

#### Scenario: Custom metric key accepted
- **WHEN** client submits a MetricsField with key `retention_rate_7d` (not in any predefined list)
- **THEN** system stores and returns it without error

#### Scenario: Standard platform metric stored
- **WHEN** client submits a MetricsField with key `views`, value `12000`, label `浏览量`, description `内容曝光次数`
- **THEN** system stores the full self-describing field and returns it verbatim on GET
