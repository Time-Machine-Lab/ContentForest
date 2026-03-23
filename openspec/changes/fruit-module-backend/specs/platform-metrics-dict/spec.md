## ADDED Requirements

### Requirement: Static platform metrics dictionary
The system SHALL maintain a static TypeScript constant in `src/domain/platform-metrics-dict.ts` that defines common metric templates for each supported platform (xiaohongshu, douyin, twitter, wechat, other). Each entry SHALL include key, label, and description fields. This dictionary SHALL NOT be stored in Redis.

#### Scenario: Dictionary contains xiaohongshu metrics
- **WHEN** the platform-metrics-dict module is imported
- **THEN** it exports entries for xiaohongshu including at minimum: views (浏览量), likes (点赞量), collects (收藏量), comments (评论量)

#### Scenario: Dictionary contains douyin metrics
- **WHEN** the platform-metrics-dict module is imported
- **THEN** it exports entries for douyin including at minimum: plays (播放量), likes (点赞量), shares (分享量), retention_rate (完播率)

### Requirement: Platform metrics dictionary HTTP endpoint
The system SHALL expose `GET /api/metrics/dict` that accepts an optional `platform` query parameter and returns the matching dictionary entries. If `platform` is omitted, all platform entries SHALL be returned.

#### Scenario: Get dictionary for specific platform
- **WHEN** client sends `GET /api/metrics/dict?platform=xiaohongshu`
- **THEN** system returns `{ code: 0, data: { platform: "xiaohongshu", fields: [ { key, label, description }, ... ] } }`

#### Scenario: Get all platform dictionaries
- **WHEN** client sends `GET /api/metrics/dict` without platform parameter
- **THEN** system returns all platform entries grouped by platform name

#### Scenario: Unknown platform returns empty
- **WHEN** client sends `GET /api/metrics/dict?platform=unknown_platform`
- **THEN** system returns `{ code: 0, data: { platform: "unknown_platform", fields: [] } }` without error
