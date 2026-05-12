# seed-brief-management Specification

## Purpose
TBD - created by archiving change add-seed-brief-backend. Update Purpose after archive.
## Requirements
### Requirement: 手动生成种子主简报
系统 SHALL 支持用户为一个已存在种子手动生成种子主简报。生成种子主简报 MUST 读取种子 Markdown 正文作为事实源，MUST 不自动改写种子正文。

#### Scenario: 成功生成主简报
- **WHEN** 用户为未归档种子触发生成主简报
- **THEN** 系统 MUST 调用受控 Agent 能力生成主简报内容
- **AND** 系统 MUST 将主简报正文保存为内容本体
- **AND** 系统 MUST 记录该种子的当前主简报系统事实

#### Scenario: 已归档种子可生成主简报
- **WHEN** 用户为已归档种子触发生成主简报
- **THEN** 系统 MUST 允许生成或刷新主简报
- **AND** 系统 MUST 不因此恢复该种子的枝化生长能力

#### Scenario: 生成失败不阻塞种子
- **WHEN** Agent 生成主简报失败或输出不可落地
- **THEN** 系统 MUST 返回可理解失败原因
- **AND** 系统 MUST 不修改种子正文
- **AND** 系统 MUST 不影响后续直接基于种子的枝化生长

### Requirement: 查看和编辑种子主简报
系统 SHALL 支持查看和编辑种子当前主简报。编辑主简报 MUST 只更新主简报内容本体和系统审计信息，MUST 不改变种子正文、内容树根节点或已有果实关系。

#### Scenario: 查看存在的主简报
- **WHEN** 用户查看已有主简报的种子
- **THEN** 系统 MUST 返回主简报系统事实和 Markdown 正文

#### Scenario: 查看不存在的主简报
- **WHEN** 用户查看尚未生成主简报的种子
- **THEN** 系统 MUST 返回可理解的未创建状态
- **AND** 系统 MUST 不返回空白伪简报

#### Scenario: 编辑主简报
- **WHEN** 用户提交非空主简报 Markdown
- **THEN** 系统 MUST 保存编辑后的主简报内容
- **AND** 系统 MUST 更新主简报更新时间

### Requirement: 刷新覆盖种子主简报
系统 SHALL 支持用户刷新种子主简报。第一版刷新 MUST 覆盖当前主简报正文，不保留历史版本；刷新失败时 MUST 保留旧简报。

#### Scenario: 刷新已有主简报
- **WHEN** 用户刷新已有主简报
- **THEN** 系统 MUST 基于最新种子正文重新生成主简报
- **AND** 系统 MUST 在生成成功后覆盖当前主简报正文

#### Scenario: 刷新失败保留旧简报
- **WHEN** 主简报刷新失败
- **THEN** 系统 MUST 保留刷新前的主简报内容
- **AND** 系统 MUST 返回可理解的刷新失败原因

### Requirement: 提供种子主简报契约文档
系统 SHALL 为种子主简报提供顶层 API 与 SQL 契约文档。接口契约 MUST 落到 `docs/api/seed.yaml`，存储结构契约 MUST 落到 `docs/sql/seed.sql`。

#### Scenario: 提供种子主简报 API 契约
- **WHEN** 开发种子主简报 Controller 能力
- **THEN** 系统 MUST 在 `docs/api/seed.yaml` 中定义对应接口
- **AND** 该接口 MUST 归属于 Seed Controller

#### Scenario: 提供种子主简报 SQL 契约
- **WHEN** 开发种子主简报存储能力
- **THEN** 系统 MUST 在 `docs/sql/seed.sql` 中定义主简报系统事实结构
- **AND** Markdown 正文 MUST 通过内容位置引用

