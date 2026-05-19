## Implementation Notes

- `docs/api/nutrient.yaml` does not need a contract change for this proposal. The xiaohongshu-cli integration runs inside the existing `networked_research` Agent tool, and Provider details remain internal trace/context rather than a public API schema.
- `docs/sql/nutrient.sql` does not need a table or column change. Platform evidence stays inside the research session context and only enters nutrient storage after the user explicitly saves a draft or settles a nutrient card through existing nutrient APIs.
