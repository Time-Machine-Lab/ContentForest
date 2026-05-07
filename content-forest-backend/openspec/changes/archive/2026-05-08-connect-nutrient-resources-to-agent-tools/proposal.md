## Why

营养库后端已经提供按种子查询可引用营养内容的能力，但枝化生长 Agent 还需要通过受控只读 Tool 正式读取这些营养 Markdown，才能把用户在生长前选择的营养内容纳入生成器上下文。

该变更承接 `docs/design/内容森林架构设计文档.md` 与 `docs/design/内容森林Agent架构设计文档.md` 中“营养内容作为枝化生长参考资源”“Agent 只能通过授权只读 Tool 读取上下文”的架构边界。

## What Changes

- 将营养内容接入枝化生长资源读取 Tool，使 `read_growth_resources` 能返回已授权营养内容的标题、所属营养库信息和 Markdown 正文。
- 在枝化生长发起阶段校验 `nutrientRefs` 是否可被当前种子引用，避免 Agent 读取归档、越权或其他种子专属营养内容。
- 保持营养库与基因库作为枝化生长参考资源的统一读取入口，不新增独立的任意营养读取 Tool。
- 保持 Agent Tool 只读边界，不写文件、不写数据库、不修改营养库、果实或生长任务状态。
- 不新增 HTTP API，不新增 SQL 表或字段，不修改营养库领域的管理能力。

## Capabilities

### New Capabilities

- `branch-growth-resource-reading`: 定义枝化生长 Agent 如何读取已授权营养内容和基因经验资源，并确保资源读取遵守任务授权边界。

### Modified Capabilities

无。`nutrient-library-management` 已经提供按种子查询可引用营养内容的能力，本变更只消费该能力，不改变营养库领域契约。

## Impact

- Affected code:
  - Agent 只读 Tool：枝化生长资源读取 Tool
  - GrowthService：生长任务引用资源授权
  - App bootstrap：Tool 装配营养库 storage/content access
  - Tests：枝化生长资源读取、授权边界、Agent Skill 上下文消费
- APIs: 无新增或变更
- SQL: 无新增或变更
- Dependencies: 复用既有 NutrientStoragePort 与 NutrientMarkdownContentAccessPort
