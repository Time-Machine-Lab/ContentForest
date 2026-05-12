## Why

营养库活化要求 Agent 帮用户进行平台资料收集、规律总结和案例整理。现有 Agent 只支持枝化生长、基因汲取和种子简报，缺少专门的联网研究能力来生成可沉淀营养。

## What Changes

- 新增 `nutrient_research` Agent 任务类型和内置营养研究 Skill。
- 新增联网搜索 Tool，供营养研究 Skill 在受控范围内获取外部信息。
- 支持营养研究会话，Agent 输出分为普通沟通内容和可沉淀营养块。
- 可沉淀营养块可创建未沉淀营养卡片或合并到已有卡片。
- 研究结果必须绑定当前种子，不能直接保存到公共营养库。

## Capabilities

### New Capabilities
- `nutrient-research-agent`: 定义营养联网研究 Agent 任务、会话、输出结构和受控搜索规则。

### Modified Capabilities

## Impact

- 需要更新 Agent 任务类型、Skill 注册、输出校验和 Trace。
- 需要新增受控联网搜索 Tool 或接入现有搜索适配器。
- 需要更新 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql` 以支持研究会话与消息持久化。
- 影响 `src/agent/`、`src/modules/nutrient/`、HTTP Controller 和测试。
