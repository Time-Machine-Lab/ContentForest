## Why

营养研究会话与营养内容当前存在双向绑定语义：点击营养内容会进入会话，会话又可能产出多个营养内容，导致“当前内容”“合并目标”和“删除影响范围”难以解释。根据 `docs/design/domain/营养库领域模块设计文档.md` 中“营养内容是资料资产、会话是 Agent 研究过程”的边界，本次变更将二者解耦，让会话只承载研究过程，营养内容只承载可引用资料资产。

## What Changes

- **BREAKING**：营养研究会话不再绑定营养内容，创建和查询会话不再使用 `nutrientCardId` 作为业务语义。
- **BREAKING**：工作台营养内容不再维护 `conversationId`，营养内容详情不再暴露“关联会话”能力。
- 新增营养研究会话删除能力；删除会话只删除会话、消息和未沉淀候选块，不影响已创建或已沉淀的营养内容。
- 调整可沉淀营养块的入库语义：可保存为新草稿营养内容，也可显式选择目标营养内容进行合并；后端不再根据“当前会话绑定内容”推断合并目标。
- 更新 `docs/api/nutrient.yaml`：移除会话与营养内容绑定契约，新增删除会话接口，明确合并目标由请求显式提供。
- 更新 `docs/sql/nutrient.sql`：移除或废弃 `nutrient_cards.conversation_id` 与 `nutrient_research_sessions.nutrient_card_id` 等绑定字段语义，并保留必要的迁移兼容说明。
- 更新顶层概念文档：`docs/内容森林第二期开发规划文档.md`、`docs/design/内容森林架构设计文档.md`、`docs/design/domain/营养库领域模块设计文档.md`，统一“会话是研究过程，营养内容是沉淀资产”的概念。

## Capabilities

### New Capabilities

- `nutrient-research-session-management`: 定义种子级营养研究会话的创建、查询、详情、消息提交、流式提交和删除能力，强调会话独立于营养内容。

### Modified Capabilities

- `nutrient-library-management`: 移除营养内容绑定会话要求，调整可沉淀营养块保存和合并目标语义，确保营养内容与研究会话互不影响。
- `nutrient-research-agent`: 将营养研究会话从“可绑定卡片”改为“只归属种子”，并补充删除会话的业务边界。

## Impact

- Affected docs: `docs/api/nutrient.yaml`, `docs/sql/nutrient.sql`, `docs/内容森林第二期开发规划文档.md`, `docs/design/内容森林架构设计文档.md`, `docs/design/domain/营养库领域模块设计文档.md`.
- Affected backend: Nutrient Controller, Nutrient application service, nutrient storage port/adapters, nutrient API tests, integration tests, SSE route tests.
- Affected data model: `nutrient_cards` no longer owns conversation identity; `nutrient_research_sessions` no longer stores card binding. Existing old fields may be ignored or migrated away in a later SQL-compatible step.
- Affected frontend dependency: frontend must switch to independent session rail and explicit merge target UI after backend contract lands.
