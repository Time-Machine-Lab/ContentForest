## Why

基因汲取领域模块已经能够创建汲取任务、准备 Agent 输入并持久化待确认建议，但当前 Agent Runtime 还缺少真正处理 `gene_extraction` 任务的内置 Skill 和证据读取 Tool。为了跑通“选择/淘汰/发布验证 → 基因建议 → 用户确认 → 基因库复利”的闭环，需要补齐 Agent 侧基因汲取能力。

本变更承接 `docs/design/内容森林Agent架构设计文档.md`、`docs/design/domain/基因汲取领域模块设计文档.md` 和 `docs/design/基因汲取Agent对接契约.md`：Agent 只负责读取授权证据并生成结构化建议，不写数据库、不写 Markdown、不确认基因经验。

## What Changes

- 新增内置基因汲取 Agent Skill，注册为处理 `gene_extraction` 任务的系统 Skill。
- 新增基因汲取只读 Tool，用于读取本次任务授权范围内的种子上下文、果实证据、发布验证证据和既有可引用基因经验。
- 保留营养库读取占位：本次不实现营养库 Tool，待营养库模块完成后由后续变更接入。
- 建立基因建议结构化输出契约，要求单次任务返回 1 到 3 条建议。
- 支持正向基因与反向基因语义：已选择和有效验证可沉淀为正向基因，已淘汰或负面证据可沉淀为反向基因。
- 支持相似基因关系提示：Agent 可以标注新增、强化、分叉或冲突，但不自动合并，最终由用户确认。
- 新增本地 Schema 校验与有限修复流程，确保 Agent 输出能被基因领域消费。
- 更新 Agent 应用装配，注册基因汲取 Skill 及其只读 Tool。
- 不新增 HTTP API，不新增数据库表，不修改 `docs/api` 或 `docs/sql` 顶层契约。

## Capabilities

### New Capabilities

- `gene-extraction-agent-skill`: 覆盖内置基因汲取 Skill、基因汲取证据读取 Tool、基因建议结构化输出校验、自检修复和 Agent Runtime 装配。

### Modified Capabilities

无。

## Impact

- 后端 Agent 层：新增内置 `gene_extraction` Skill、结构化输出契约、输出校验和只读 Tool。
- 后端应用装配：注册基因汲取 Skill 与相关 Tool。
- 基因汲取领域：不改变领域持久化模型，但会消费更严格的 Agent 输出结构。
- 发布验证模块：其已存在的发布记录可作为弱/中等证据上下文被只读 Tool 读取。
- 营养库：本次只保留占位，不依赖尚未完成的营养库实现。
- 测试：新增 Tool、Skill、结构化校验和 GeneService 集成测试。
