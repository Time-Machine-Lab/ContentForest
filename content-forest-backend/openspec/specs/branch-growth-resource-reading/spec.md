## Purpose

定义枝化生长 Agent 读取已授权营养内容和基因经验的资源 Tool 边界，包括营养引用可引用性校验、任务授权范围和营养库契约不变约束。

## Requirements

### Requirement: 枝化生长读取已授权营养内容
系统 SHALL 允许枝化生长 Agent 通过只读资源 Tool 读取本次生长任务已授权的营养内容。营养内容 MUST 来自当前种子可引用范围，且 MUST 以 Markdown 正文形式作为参考资源返回。

#### Scenario: 读取公共营养内容
- **WHEN** 枝化生长任务的授权范围包含一个未归档公共营养内容引用
- **THEN** 资源读取 Tool MUST 返回该营养内容的资源 ID、标题、所属营养库摘要和 Markdown 正文
- **AND** 返回内容 MUST NOT 包含本地绝对文件路径

#### Scenario: 读取当前种子专属营养内容
- **WHEN** 枝化生长任务的授权范围包含一个归属于当前种子的未归档专属营养内容引用
- **THEN** 资源读取 Tool MUST 返回该营养内容
- **AND** 返回内容 MUST 标明其所属营养库为种子专属作用域

### Requirement: 枝化生长校验营养引用可引用性
系统 SHALL 在创建枝化生长任务时校验营养引用是否可被当前种子引用。不可引用的营养内容 MUST 被拒绝进入任务授权范围。

#### Scenario: 拒绝其他种子的专属营养
- **WHEN** 用户在当前种子的枝化生长请求中引用其他种子的专属营养内容
- **THEN** 系统 MUST 拒绝创建该生长任务
- **AND** Agent MUST NOT 接收到该营养内容引用

#### Scenario: 拒绝归档营养
- **WHEN** 用户在枝化生长请求中引用已归档营养库或已归档营养内容
- **THEN** 系统 MUST 拒绝创建该生长任务
- **AND** Agent MUST NOT 读取该营养内容 Markdown

### Requirement: 资源读取 Tool 遵守任务授权边界
资源读取 Tool SHALL 只读取任务授权范围内列出的营养内容和基因经验。Agent 在 Tool 输入中请求未授权资源时，系统 MUST 拒绝或忽略该资源，且不得泄露正文。

#### Scenario: Agent 请求未授权营养内容
- **WHEN** Agent 调用资源读取 Tool 时请求未出现在任务授权范围内的营养内容
- **THEN** Tool MUST NOT 返回该营养内容正文
- **AND** Tool MUST 保持只读，不修改任何系统事实

#### Scenario: 同时返回营养与基因资源
- **WHEN** 枝化生长任务同时授权营养内容引用和基因经验引用
- **THEN** 资源读取 Tool MUST 在同一结果中返回可读取的营养资源集合和基因资源集合
- **AND** 枝化生长 Skill MUST 能将这些资源作为生成器上下文的一部分使用

### Requirement: 不改变营养库领域契约
本变更 SHALL 复用既有营养库可引用查询能力，不新增营养库 HTTP API，不新增 SQL 表或字段，不改变营养库内容管理规则。

#### Scenario: 接入 Agent Tool 不修改 API 和 SQL
- **WHEN** 实现营养内容接入枝化生长资源 Tool
- **THEN** 系统 MUST NOT 新增或修改 `docs/api/nutrient.yaml`
- **AND** 系统 MUST NOT 新增或修改 `docs/sql/nutrient.sql`
