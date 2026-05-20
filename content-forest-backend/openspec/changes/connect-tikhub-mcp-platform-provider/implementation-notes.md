## Implementation Notes

- `docs/api/nutrient.yaml` does not need a contract change for this proposal. TikHub MCP evidence remains inside the existing nutrient research Agent context package, and the public API continues to expose research sessions, messages, trace summaries, and depositable nutrient blocks.
- `docs/sql/nutrient.sql` does not need new tables or columns. TikHub MCP candidates and observed cases remain research evidence until the user saves or settles a nutrient card. The SQL comments now clarify that this TikHub MCP integration does not create a new nutrient system-fact table.
