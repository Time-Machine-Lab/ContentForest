## Why

营养库要“活”起来，不能只依赖用户主动发现缺资料。系统需要从种子简报、生长输入、生成反馈和淘汰行为中形成营养缺口建议，并集中展示在营养工作台右侧。

## What Changes

- 新增营养汲取建议模型，支持待处理、已采纳、已忽略状态。
- 支持基于种子主简报证据缺口、枝化生长前检查、用户输入平台方向、果实淘汰和生成效果形成建议。
- 支持采纳建议创建未沉淀营养卡片，并把建议内容作为研究输入。
- 支持忽略建议并不再展示。

## Capabilities

### New Capabilities
- `nutrient-gap-suggestions`: 定义营养缺口发现、建议生成、采纳和忽略规则。

### Modified Capabilities

## Impact

- 需要更新 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql`。
- 影响种子简报、枝化生长、果实选择/淘汰和营养模块之间的事件消费或应用服务协作。
- 影响 workspace 聚合，需返回待处理营养汲取建议摘要。
