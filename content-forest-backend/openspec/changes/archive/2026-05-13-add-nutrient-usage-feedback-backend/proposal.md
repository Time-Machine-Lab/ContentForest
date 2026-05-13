## Why

营养库保持新鲜和有效，不能只靠新增资料。系统需要记录营养被如何引用、影响了哪些果实，以及这些果实后续的选择、淘汰和发布反馈，从而为刷新、归档、合并和重新研究提供依据。

## What Changes

- 记录正式营养和未沉淀营养在枝化生长中的引用关系。
- 汇总营养影响的果实及其后续选择、淘汰、发布反馈摘要。
- 增加新鲜度字段和过期提醒语义。
- 增加轻量去重与合并支持，允许将可沉淀营养块合并到已有卡片。
- 不做复杂营养质量评分和自动淘汰。

## Capabilities

### New Capabilities
- `nutrient-usage-feedback`: 定义营养引用记录、效果回流、新鲜度提醒和轻量合并规则。

### Modified Capabilities

## Impact

- 需要更新 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql`。
- 需要在枝化生长落地果实时记录本次使用的营养引用。
- 需要读取果实状态、发布记录和反馈摘要形成营养使用结果。
- 影响 `src/modules/nutrient/`、`src/modules/growth/`、workspace 聚合和测试。
