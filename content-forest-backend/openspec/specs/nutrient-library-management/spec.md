## Purpose

定义内容森林后端营养库管理能力。营养库用于组织公共营养和种子专属营养，营养内容正文以 Markdown 内容本体保存，系统事实由数据库维护，并为枝化生长和 Agent 只读工具提供受控可引用营养查询。

## Requirements

### Requirement: 维护营养库
后端 SHALL 提供营养库创建、查看、编辑、归档和回档能力。营养库 MUST 支持公共作用域和种子专属作用域；名称 MUST 必填，描述 MUST 支持非必填。

#### Scenario: 创建公共营养库
- **WHEN** 用户提交公共营养库名称和可选描述
- **THEN** 系统 MUST 创建公共营养库
- **AND** 该营养库 MUST 可被任意种子的枝化生长引用

#### Scenario: 创建种子专属营养库
- **WHEN** 用户提交种子专属营养库名称、可选描述和归属种子
- **THEN** 系统 MUST 创建归属于该种子的营养库
- **AND** 该营养库 MUST 只允许归属种子的枝化生长引用

#### Scenario: 编辑营养库名称和描述
- **WHEN** 用户编辑营养库名称或描述
- **THEN** 系统 MUST 更新营养库的名称或描述
- **AND** 系统 MUST NOT 改变该营养库的作用域和归属种子

#### Scenario: 归档和回档营养库
- **WHEN** 用户归档营养库
- **THEN** 系统 MUST 将该营养库标记为已归档
- **AND** 该营养库 MUST NOT 出现在新的枝化生长可引用范围中
- **WHEN** 用户回档该营养库
- **THEN** 系统 MUST 将该营养库恢复为可用状态

### Requirement: 维护营养内容
后端 SHALL 支持在营养库下新增、查看、编辑、归档和回档营养内容。营养内容正文 MUST 使用 Markdown 文本；第一期 MUST 支持手写或复制粘贴，不要求文件上传。

#### Scenario: 新增 Markdown 营养内容
- **WHEN** 用户在未归档营养库下提交营养内容标题和 Markdown 正文
- **THEN** 系统 MUST 保存营养内容正文为 Markdown 内容本体
- **AND** 系统 MUST 维护该营养内容所属营养库、归档状态和内容本体位置

#### Scenario: 编辑营养内容正文
- **WHEN** 用户编辑营养内容标题或 Markdown 正文
- **THEN** 系统 MUST 更新营养内容
- **AND** 系统 MUST NOT 改变营养内容身份和所属营养库

#### Scenario: 归档和回档营养内容
- **WHEN** 用户归档营养内容
- **THEN** 系统 MUST 将该营养内容标记为已归档
- **AND** 该营养内容 MUST NOT 出现在新的枝化生长可引用范围中
- **WHEN** 用户回档该营养内容
- **THEN** 系统 MUST 将该营养内容恢复为可用状态

### Requirement: 分离内容本体与系统事实
后端 SHALL 将营养内容 Markdown 正文保存为内容本体，并将营养库作用域、归属、归档状态、内容位置等系统事实保存到数据库。Markdown MUST NOT 保存由数据库维护的 meta 信息。

#### Scenario: 保存营养内容
- **WHEN** 系统保存营养内容
- **THEN** Markdown 正文 MUST 写入运行时内容目录
- **AND** 系统事实 MUST 写入数据库
- **AND** 数据库中的内容位置 MUST 使用相对内容位置

### Requirement: 提供可引用营养查询
后端 SHALL 提供按种子获取可引用营养内容的能力。可引用结果 MUST 包含公共营养内容和归属该种子的种子专属营养内容，并 MUST 排除已归档营养库和已归档营养内容。

#### Scenario: 查询某个种子的可引用营养
- **WHEN** 枝化生长或 Agent Tool 请求某个种子的可引用营养内容
- **THEN** 系统 MUST 返回未归档公共营养内容
- **AND** 系统 MUST 返回该种子所属的未归档种子专属营养内容
- **AND** 系统 MUST NOT 返回其他种子的专属营养内容
- **AND** 系统 MUST NOT 返回任何已归档营养库或已归档营养内容

### Requirement: 补齐顶层 API 与 SQL 契约
后端实现营养库能力前 MUST 新增或更新 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql`。营养库相关 HTTP 能力 MUST 归属于单一 nutrient Controller 契约。

#### Scenario: 开始实现营养库模块
- **WHEN** 开发者开始实现营养库模块代码
- **THEN** `docs/api/nutrient.yaml` MUST 已定义营养库与营养内容的应用接口
- **AND** `docs/sql/nutrient.sql` MUST 已定义营养库与营养内容的系统事实结构
