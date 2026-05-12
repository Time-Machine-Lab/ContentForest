## Why

基因库现在已经不只是“沉淀结果”，而应该成为种子级的进化资产：要能持续跟进、评优、迭代、分叉和回看。否则基因只会停留在一次性提取，无法形成真正的复利效应。

## What Changes

- 把基因库从“确认后沉淀”的静态容器，升级为“可持续跟进与迭代”的种子级进化系统。
- 为基因引入持续评分、表现回看、优劣比较和阶段性演化的能力。
- 让同一种子下的多个基因谱系可以长期并存、被比较和被重新排序，而不是只保留一次确认结果。
- 让后续枝化生长可以读取更有“权重感”的基因上下文，而不是平铺式经验集合。
- 这次调整会同步影响总纲、领域、Agent、API 和存储契约文档，而不只是一份领域文档。

## Capabilities

### New Capabilities
- `gene-library-evolution`: 种子级基因库的持续跟进、评优、迭代和谱系演化能力。

### Modified Capabilities
- `gene-extraction`: 基因汲取领域需要把“确认后沉淀”扩展为“沉淀后持续演化”的资产流。
- `content-evolution-strategy`: 内容进化策略需要支持基因持续评分、筛选和版本迭代的语义。
- `gene-extraction-agent-connection`: Agent 输入需要能消费更丰富的基因库上下文与跟进信息。

## Impact

- 顶层设计文档：
  - `docs/design/内容森林架构设计文档.md`
  - `docs/design/内容森林Agent架构设计文档.md`
  - `docs/design/domain/基因汲取领域模块设计文档.md`
  - `docs/design/内容森林概念设计文档.md`
  - `docs/design/内容森林第一期开发规划文档.md`
- 开发规范：
  - `docs/spec/后端开发规范文档.md`
  - `docs/spec/前端开发规范文档.md`
- 契约文件：
  - `docs/api/gene.yaml`
  - `docs/sql/gene.sql`
- 后端实现：
  - 基因库相关应用服务、存储适配、查询与演化逻辑
  - 基因汲取与枝化生长对基因上下文的消费方式
