## ADDED Requirements

### Requirement: 组装本轮生长简报
系统 SHALL 在每次枝化生长任务执行前组装本轮生长简报。本轮生长简报 MUST 作为临时 Agent 输入上下文，MUST 不替代种子主简报，也 MUST 不作为长期可编辑文档持久化。

#### Scenario: 存在种子主简报时组装上下文
- **WHEN** 用户基于种子或果实发起枝化生长
- **AND** 当前种子存在主简报
- **THEN** 系统 MUST 将种子正文、种子主简报、来源节点、用户输入、生成器、引用营养和引用基因纳入本轮生长简报

#### Scenario: 不存在种子主简报时降级
- **WHEN** 用户发起枝化生长且当前种子没有主简报
- **THEN** 系统 MUST 直接基于种子正文、来源节点、用户输入和引用资源组装本轮生长简报
- **AND** 系统 MUST 不阻塞枝化生长

### Requirement: 支持搜索模式和突变激进程度
系统 SHALL 支持枝化生长请求携带搜索模式和突变激进程度。搜索模式和突变激进程度 MAY 由用户选择，也 MAY 由系统推荐默认值。系统 MUST 不要求用户输入数字突变率。

#### Scenario: 用户提交搜索模式和突变程度
- **WHEN** 用户提交枝化生长请求并选择搜索模式和突变激进程度
- **THEN** 系统 MUST 将其纳入本轮生长策略
- **AND** 系统 MUST 将其传递给 AgentPort 的枝化生长输入

#### Scenario: 用户未选择时使用系统推荐
- **WHEN** 用户未显式选择搜索模式或突变激进程度
- **THEN** 系统 MUST 基于来源节点、历史反馈和可用基因生成默认推荐
- **AND** 系统 MUST 在任务记录或 trace 中保留推荐结果摘要

### Requirement: 动态发现突变方向
系统 SHALL 由创作搜索层动态发现候选突变方向。候选突变方向 MUST 基于种子、主简报、父果实、营养、基因和用户输入，不得被限制为固定枚举。

#### Scenario: 基于多源上下文发现方向
- **WHEN** 系统执行创作搜索层
- **THEN** 系统 MUST 基于当前授权上下文生成候选突变方向
- **AND** 候选方向 MUST 保留不偏离种子核心的约束

#### Scenario: 激进突变仍受种子约束
- **WHEN** 用户选择激进突变
- **THEN** 系统 MAY 探索更远的内容路线
- **AND** 系统 MUST 保留种子事实、用户明确要求和生成器目标格式

### Requirement: 维护用户可见生成路径图
系统 SHALL 为生成中的生长任务或内部 attempt 维护用户可见路径图。路径图 MUST 包含人能理解的实际任务步骤，并允许 Agent 或生成器执行阶段追加用户可理解子步骤。系统 MUST NOT 将 Agent Trace、Tool 调用、LLM 调用或 Skill 调用日志直接映射为用户可见路径步骤。

#### Scenario: 创建任务时初始化路径图
- **WHEN** 生长任务开始执行
- **THEN** 系统 MUST 初始化包含用户可理解大阶段的路径图
- **AND** 每个步骤 MUST 有可展示的名称和状态

#### Scenario: Agent 追加子步骤
- **WHEN** Agent 在生成器执行阶段上报新的子步骤
- **THEN** 系统 MUST 将该子步骤追加到对应路径图
- **AND** 前端后续查询任务状态时 MUST 能看到更新后的路径图

#### Scenario: 工程 Trace 不进入用户路径图
- **WHEN** Agent 运行过程中产生 task_started、skill_called、tool_called、llm_called 等工程事件
- **THEN** 系统 MUST 将这些事件保留在日志或调试 Trace 中
- **AND** 系统 MUST NOT 将这些事件直接返回为 pathGraph 中的用户可见步骤

#### Scenario: 路径步骤表达实际工作
- **WHEN** 系统返回生成路径图
- **THEN** 每个用户可见步骤 MUST 表达一件实际工作
- **AND** 步骤名称 SHOULD 使用类似“获取输入”“补全上下文”“发现创作方向”“生成文案”“生成封面”“封装候选果实”的语义

#### Scenario: 任务完成后路径图不作为果实内容
- **WHEN** 生长任务完成或失败
- **THEN** 系统 MUST 不把路径图写入果实 Markdown 正文
- **AND** 路径图 MUST 不影响果实物竞天择状态

### Requirement: 提供管线契约文档
系统 SHALL 为枝化生长管线提供顶层 API 与 SQL 契约文档。接口契约 MUST 落到 `docs/api/growth.yaml`，存储结构契约 MUST 落到 `docs/sql/growth.sql`。

#### Scenario: 提供枝化生长管线 API 契约
- **WHEN** 开发生长管线相关接口或响应字段
- **THEN** 系统 MUST 在 `docs/api/growth.yaml` 中定义请求、状态和路径图字段

#### Scenario: 提供枝化生长管线 SQL 契约
- **WHEN** 开发生长管线存储能力
- **THEN** 系统 MUST 在 `docs/sql/growth.sql` 中定义必要系统事实或 JSON 字段
