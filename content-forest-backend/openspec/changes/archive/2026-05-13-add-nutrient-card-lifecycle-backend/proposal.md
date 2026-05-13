## Why

第二期营养库需要从“已沉淀 Markdown 资料”扩展为“可研究、可临时引用、可沉淀、可归档的种子级营养卡片”。现有营养库已经支持公共/种子专属营养内容管理，但缺少未沉淀卡片、常驻营养和临时引用语义。

## What Changes

- 为种子专属营养引入营养卡片生命周期：未沉淀、已沉淀、已归档。
- 支持未沉淀营养卡片作为本次枝化生长的临时引用。
- 支持已沉淀营养卡片作为正式营养引用，并继续复用现有种子专属营养库能力。
- 为已沉淀营养增加“常驻营养”语义，表示每次枝化生长默认带入但用户可移除。
- 增加营养卡片与会话的绑定关系，为后续持续优化提供后端基础。
- 不允许 Agent 研究结果保存到公共营养库。

## Capabilities

### New Capabilities

### Modified Capabilities
- `nutrient-library-management`: 增加种子级营养卡片生命周期、未沉淀临时引用、常驻营养和卡片会话绑定要求。
- `branch-growth`: 增加对未沉淀营养卡片临时引用的授权与 Agent 输入传递要求。

## Impact

- 需要更新 `docs/api/nutrient.yaml`，补充营养卡片状态、常驻营养、会话绑定和临时引用相关接口。
- 需要更新 `docs/sql/nutrient.sql`，补充营养卡片状态、常驻标记、会话标识等系统事实。
- 需要更新枝化生长 API 契约，使生长请求可接收临时营养卡片引用。
- 影响 `src/modules/nutrient/`、`src/modules/growth/`、workspace 聚合和 Agent 资源读取授权。
