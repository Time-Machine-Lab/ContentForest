## Why

当前营养库领域同时暴露“营养内容”和“营养卡片”两个近似概念，用户在营养工作台中会困惑：卡片到底是不是资料、沉淀后归到哪里、草稿能不能删除。这个变更将用户侧概念统一为“营养内容”，让卡片退回为工作台中的展示和生命周期承载形式，并通过默认种子专属营养库降低用户启动成本。

## What Changes

- 修正 `docs/design/domain/营养库领域模块设计文档.md`：明确“营养内容”是唯一用户侧资料概念，“营养卡片”仅作为营养工作台中的 UI/内部承载形态。
- 更新 `docs/api/nutrient.yaml`：补齐默认种子专属营养库确保接口、草稿营养硬删除接口，并允许沉淀草稿时不手动传入目标库。
- 更新 `docs/sql/nutrient.sql`：修正文档注释与约束语义，说明 `nutrient_cards` 是营养内容在工作台中的生命周期承载表，而不是独立领域概念。
- 后端支持打开营养工作台时幂等确保当前种子的默认专属营养库存在。
- 后端支持草稿态营养内容硬删除；沉淀态和归档态仍不允许硬删除，只能归档或回档。
- 后端保留现有内部状态值 `unsettled / settled / archived`，但领域语言解释为 `草稿 / 已沉淀 / 已归档`，避免大规模迁移。
- 将“常驻营养”用户侧表达修正为“默认带入”，后端仍可使用现有 `defaultForGrowth` 契约表达该系统事实。

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `nutrient-library-management`: 统一营养内容生命周期语义，新增默认专属营养库确保能力，新增草稿营养删除能力，并调整沉淀流程对目标库的要求。

## Impact

- 顶层文档：`docs/design/domain/营养库领域模块设计文档.md`
- API 文档：`docs/api/nutrient.yaml`
- SQL 文档：`docs/sql/nutrient.sql`
- 后端模块：Nutrient Controller、营养库/营养内容应用服务、内容文件存储清理逻辑、营养工作台相关测试
- 向后兼容：保留现有 `nutrient_cards` 表和 API 基础路径；本变更主要统一语义并补齐能力，不要求历史数据迁移。
