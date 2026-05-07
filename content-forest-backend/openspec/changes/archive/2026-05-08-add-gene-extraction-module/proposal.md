## Why

内容森林已经具备种子、果实和 Agent Runtime 的基础能力，但“数据与选择如何沉淀成可复用进化经验”尚未落地。基因汲取模块需要把果实选择/淘汰、后续发布验证与数据回流转化为可确认的基因建议，并最终沉淀到种子级基因库，为下一轮枝化生长提供经验复利。

## What Changes

- 新增基因汲取后端模块，负责种子级基因库、汲取提醒、汲取任务、基因建议和基因经验的业务能力。
- 支持基于果实选择/淘汰触发第一版轻量汲取提醒，后续可接入发布验证和数据回流领域消息。
- 支持用户人为触发基因汲取，调用 AgentPort 的 `gene_extraction` 能力生成基因建议。
- 持久化基因建议为待确认草稿，允许用户查看、编辑、确认或放弃。
- 用户确认基因建议后，写入正式基因经验：Markdown 保存正文，数据库维护归属、证据、谱系、生态位、状态和内容位置。
- 提供查询种子级基因库经验的能力，供后续枝化生长引用。
- 补齐顶层契约文档：新增 `docs/api/gene.yaml` 与 `docs/sql/gene.sql`，并保持一份 API 契约对应一个 Controller、一张表对应一个 SQL 文档的约束。

## Capabilities

### New Capabilities

- `gene-extraction`: 覆盖种子级基因库准备、汲取提醒、汲取任务、基因建议持久化、建议确认/放弃、正式基因经验沉淀与查询。

### Modified Capabilities

无。

## Impact

- 后端源码：新增 `src/modules/gene` 下的领域类型、应用服务和模块出口。
- 存储层：新增基因汲取相关 Storage Port、内存适配器、SQLite 适配器与迁移。
- 内容访问层：新增基因经验 Markdown 的读取/写入端口与本地文件适配器。
- Agent 层：接入现有 AgentPort 的 `gene_extraction` 任务类型，新增或注册基因汲取 Skill 所需的任务输出约束。
- HTTP 层：新增 `gene-controller`，暴露基因库、提醒、任务、建议和基因经验相关应用能力。
- 顶层契约：新增 `docs/api/gene.yaml` 与 `docs/sql/gene.sql`。
- 测试：新增基因模块服务测试、内容访问测试、存储适配测试和 HTTP 集成测试。
