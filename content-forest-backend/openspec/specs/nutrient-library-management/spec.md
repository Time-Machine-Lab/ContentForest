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
后端 SHALL 提供按种子获取可引用营养内容的能力。可引用结果 MUST 包含公共营养内容和归属该种子的种子专属营养内容，并 MUST 排除已归档营养库、已归档营养内容和已归档营养卡片。查询结果 SHOULD 标识哪些已沉淀营养为常驻营养。

#### Scenario: 查询某个种子的可引用营养
- **WHEN** 枝化生长或 Agent Tool 请求某个种子的可引用营养内容
- **THEN** 系统 MUST 返回未归档公共营养内容
- **AND** 系统 MUST 返回该种子所属的未归档种子专属营养内容
- **AND** 系统 MUST NOT 返回其他种子的专属营养内容
- **AND** 系统 MUST NOT 返回任何已归档营养库、已归档营养内容或已归档营养卡片
- **AND** 系统 SHOULD 标识常驻营养

### Requirement: 补齐顶层 API 与 SQL 契约
后端实现营养库能力前 MUST 新增或更新 `docs/api/nutrient.yaml` 和 `docs/sql/nutrient.sql`。营养库相关 HTTP 能力 MUST 归属于单一 nutrient Controller 契约。

#### Scenario: 开始实现营养库模块
- **WHEN** 开发者开始实现营养库模块代码
- **THEN** `docs/api/nutrient.yaml` MUST 已定义营养库与营养内容的应用接口
- **AND** `docs/sql/nutrient.sql` MUST 已定义营养库与营养内容的系统事实结构

### Requirement: 维护种子级营养卡片生命周期
系统 SHALL 支持当前种子下工作台营养内容的草稿、已沉淀、已归档状态。草稿内容表示仍在研究或整理中；已沉淀内容表示已经写入当前种子专属营养库；已归档内容表示保留历史但不可引用。工作台营养内容 MUST NOT 绑定营养研究会话；Agent 研究产出的可沉淀营养块只有在用户显式保存或合并时才进入营养内容生命周期。

#### Scenario: 创建草稿营养内容
- **WHEN** 用户采纳营养汲取建议或从 Agent 可沉淀营养块保存新内容
- **THEN** 系统 MUST 在当前种子下创建草稿营养内容
- **AND** 系统 MUST NOT 将该内容写入公共营养库
- **AND** 系统 MUST NOT 将该内容绑定到研究会话

#### Scenario: 沉淀营养内容
- **WHEN** 用户将草稿营养内容确认为已沉淀
- **THEN** 系统 MUST 将该内容保存为当前种子专属营养库中的正式营养内容
- **AND** 系统 MUST 保留工作台内容与正式营养内容的关联
- **AND** 系统 MUST NOT 创建或修改任何研究会话

#### Scenario: 归档营养内容
- **WHEN** 用户归档工作台营养内容
- **THEN** 系统 MUST 将该内容标记为已归档
- **AND** 已归档内容 MUST NOT 出现在可引用营养范围中
- **AND** 系统 MUST NOT 影响任何研究会话

### Requirement: 支持常驻营养
系统 SHALL 支持已沉淀营养卡片设置为常驻营养。常驻营养表示每次枝化生长时前端默认带入该营养，但用户仍可在发起生长前移除。

#### Scenario: 设置常驻营养
- **WHEN** 用户将已沉淀营养卡片设置为常驻营养
- **THEN** 系统 MUST 保存该卡片的 `defaultForGrowth` 系统事实
- **AND** 工作区聚合 MUST 能返回该标记供前端默认带入

#### Scenario: 未沉淀卡片不能设置常驻
- **WHEN** 用户尝试将未沉淀营养卡片设置为常驻营养
- **THEN** 系统 MUST 拒绝该操作
- **AND** 系统 MUST 返回用户可理解的状态限制错误

### Requirement: 营养研究会话必须兼容非流式与流式提交
营养研究会话能力 MUST 同时支持现有非流式消息提交和新增流式消息提交，且两者保存的系统事实必须保持一致。

#### Scenario: 使用现有非流式接口提交消息
- **WHEN** 前端调用 `POST /api/nutrient-research-sessions/{sessionId}/messages`
- **THEN** 系统 MUST 保持现有 JSON 响应行为
- **AND** 系统 MUST 不要求调用方切换到 SSE

#### Scenario: 使用新增流式接口提交消息
- **WHEN** 前端调用新增的营养研究消息流式接口
- **THEN** 系统 MUST 复用同一研究会话、研究消息和可沉淀营养块语义
- **AND** 系统 MUST 不新增独立于营养研究会话之外的任务系统

### Requirement: 流式研究不得破坏后端分层边界
营养研究流式提交 MUST 继续通过 Nutrient 应用服务和 AgentPort 执行，Controller 不得直接访问存储、内容文件或 Agent Runtime。

#### Scenario: Controller 处理 SSE 请求
- **WHEN** HTTP 层收到流式研究请求
- **THEN** Controller MUST 只负责请求解析、响应事件写出和错误映射
- **AND** 业务规则、消息保存、Agent 调用和可沉淀块保存 MUST 位于应用服务边界内

### Requirement: 统一营养内容工作台生命周期语言
后端 SHALL 将种子营养工作台中的草稿、沉淀和归档资料统一视为营养内容的生命周期形态。`nutrient_cards` 可以作为内部系统事实承载，但顶层文档、API 描述和业务错误信息 MUST 避免把“营养卡片”表达为独立于营养内容之外的新领域对象。营养内容 SHALL 独立于营养研究会话；营养内容详情、列表和生命周期操作 MUST NOT 依赖或暴露会话绑定关系。

#### Scenario: 返回工作台营养内容
- **WHEN** 客户端查询某个种子下的工作台营养内容列表
- **THEN** 后端 MUST 返回草稿、已沉淀和已归档三类状态对应的数据
- **AND** 内部状态值 `unsettled` MUST 表达为草稿语义
- **AND** 内部状态值 `settled` MUST 表达为已沉淀语义
- **AND** 内部状态值 `archived` MUST 表达为已归档语义
- **AND** 返回结果 MUST NOT 包含营养研究会话标识

#### Scenario: 更新顶层文档语言
- **WHEN** 开发者开始实现营养内容生命周期统一
- **THEN** `docs/design/domain/营养库领域模块设计文档.md` MUST 说明营养内容是用户侧唯一资料概念
- **AND** `docs/design/domain/营养库领域模块设计文档.md` MUST 说明营养研究会话是独立研究过程，不属于营养内容身份
- **AND** `docs/sql/nutrient.sql` MUST 说明 `nutrient_cards` 是营养内容在工作台中的生命周期承载表
- **AND** `docs/api/nutrient.yaml` MUST 使用草稿、沉淀、归档和默认带入语义描述相关接口

### Requirement: 确保默认种子专属营养库
后端 SHALL 提供幂等能力，确保指定种子存在一个可用于营养工作台沉淀的默认种子专属营养库。该能力 MUST 归属于 `docs/api/nutrient.yaml` 的 Nutrient Controller 契约，并 MUST 使用 `docs/sql/nutrient.sql` 中的 `nutrient_libraries` 表维护系统事实。

#### Scenario: 种子没有默认专属营养库
- **WHEN** 客户端请求确保某个种子的默认专属营养库
- **THEN** 后端 MUST 创建一个归属于该种子的未归档种子专属营养库
- **AND** 后端 MUST 返回该营养库详情
- **AND** 新营养库 MUST 可作为草稿营养内容沉淀目标

#### Scenario: 种子已有可用默认专属营养库
- **WHEN** 客户端重复请求确保同一种子的默认专属营养库
- **THEN** 后端 MUST 返回已存在的默认专属营养库
- **AND** 后端 MUST NOT 创建重复默认库

### Requirement: 沉淀草稿营养内容时自动选择默认库
后端 SHALL 支持将草稿态工作台营养内容沉淀为当前种子的正式营养内容。沉淀请求提供目标库时 MUST 校验目标库属于当前种子且未归档；沉淀请求未提供目标库时 MUST 自动确保并使用当前种子的默认专属营养库。

#### Scenario: 指定目标库沉淀草稿
- **WHEN** 客户端提交草稿营养内容沉淀请求并携带目标库
- **THEN** 后端 MUST 校验目标库为当前种子的未归档种子专属营养库
- **AND** 后端 MUST 创建正式营养内容并关联草稿的沉淀结果
- **AND** 后端 MUST 将草稿状态更新为已沉淀

#### Scenario: 未指定目标库沉淀草稿
- **WHEN** 客户端提交草稿营养内容沉淀请求但未携带目标库
- **THEN** 后端 MUST 确保当前种子的默认专属营养库存在
- **AND** 后端 MUST 将草稿沉淀到该默认专属营养库
- **AND** 后端 MUST 返回已沉淀的工作台营养内容详情

### Requirement: 删除草稿态营养内容
后端 SHALL 允许删除草稿态工作台营养内容。删除 MUST 只允许作用于草稿态；已沉淀和已归档营养内容 MUST NOT 被硬删除。

#### Scenario: 删除草稿营养内容
- **WHEN** 客户端请求删除草稿态营养内容
- **THEN** 后端 MUST 删除该草稿的系统事实
- **AND** 后端 MUST 尽力清理该草稿对应的 Markdown 内容本体
- **AND** 后端 MUST NOT 影响已经沉淀的正式营养内容

#### Scenario: 拒绝删除非草稿营养内容
- **WHEN** 客户端请求删除已沉淀或已归档营养内容
- **THEN** 后端 MUST 拒绝请求并返回业务错误
- **AND** 后端 MUST 保留该营养内容的系统事实和 Markdown 内容本体

### Requirement: 默认带入营养内容
后端 SHALL 支持将已沉淀营养内容标记为枝化生长的默认带入资料。默认带入标记 MUST 只影响可引用营养查询结果，不得使后端在枝化生长中强制引用该内容。

#### Scenario: 设置默认带入
- **WHEN** 客户端请求将已沉淀营养内容设置为默认带入
- **THEN** 后端 MUST 校验该内容处于已沉淀状态
- **AND** 后端 MUST 更新默认带入系统事实
- **AND** 后端 MUST 在可引用营养查询结果中返回该标记

#### Scenario: 草稿或归档内容不能设置默认带入
- **WHEN** 客户端请求将草稿或已归档营养内容设置为默认带入
- **THEN** 后端 MUST 拒绝请求并返回业务错误
- **AND** 后端 MUST NOT 修改默认带入标记

### Requirement: 营养研究会话查询契约必须归属于营养库接口文档
后端 SHALL 在 `docs/api/nutrient.yaml` 中维护营养研究会话创建、详情、消息、流式提交、可沉淀块和种子级会话列表接口。营养研究会话相关 HTTP 能力 MUST 归属于单一 nutrient Controller 契约。

#### Scenario: 新增种子级会话列表接口
- **WHEN** 后端新增按种子查询营养研究会话的 HTTP 能力
- **THEN** 系统 MUST 更新 `docs/api/nutrient.yaml`
- **AND** 系统 MUST 不新增第二份营养研究专用 API 文档

#### Scenario: 更新流式事件契约
- **WHEN** 后端新增或修改营养研究 SSE 事件类型
- **THEN** 系统 MUST 在 `docs/api/nutrient.yaml` 中描述事件类型、事件字段和错误语义
- **AND** 前端 MUST 能根据该文档更新类型定义

