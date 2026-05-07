# 基因汲取 Agent 对接契约

## 1. 契约边界

基因汲取模块只负责准备 Agent 输入和消费 Agent 输出，不实现 Agent 工具、内置 Skill 或入口注册。Agent 不写数据库、不写文件、不修改果实或基因经验状态。

## 2. 输入契约

基因模块通过 `AgentPort` 发起 `gene_extraction` 任务。输入必须包含：

- `seedId`：本次汲取归属的种子。
- `taskId`：后端创建的汲取任务。
- `evidenceSources`：本次汲取证据来源，至少一项。
- `fruitEvidence`：与证据相关的果实 meta、内容位置、摘要和基因标签。
- `referableGeneInsights`：同一种子下未归档、可引用的既有基因经验 meta 和内容位置。

输入中的内容位置是相对路径，Agent 如需正文应通过受控只读 Tool 读取。

## 3. 输出契约

Agent 输出必须能被归一化为 `suggestions` 数组。每条建议至少包含：

- `title`：建议标题。
- `bodyMarkdown`：待确认基因建议正文。

可选包含：

- `lineage`：谱系建议。
- `niche`：生态位建议。
- `evidenceInterpretation`：Agent 对证据的理解说明。

基因模块只持久化待确认建议。用户确认前，不写入基因库 Markdown。
