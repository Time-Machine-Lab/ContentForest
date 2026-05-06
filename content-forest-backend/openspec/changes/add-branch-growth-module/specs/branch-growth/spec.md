## ADDED Requirements

### Requirement: 发起枝化生长任务
系统 SHALL 支持用户从种子或果实来源节点发起一次枝化生长任务。一次用户提交 MUST 对应一个用户可见的生长任务批次，任务初始状态 MUST 为生成中。

#### Scenario: 从种子发起生长
- **WHEN** 用户基于一个可生长种子提交枝化生长请求
- **THEN** 系统 MUST 创建一个生成中的生长任务
- **AND** 系统 MUST 将该种子记录为任务来源节点

#### Scenario: 从果实发起生长
- **WHEN** 用户基于一个可生长果实提交枝化生长请求
- **THEN** 系统 MUST 创建一个生成中的生长任务
- **AND** 系统 MUST 将该果实记录为任务来源节点

#### Scenario: 不支持无来源节点生长
- **WHEN** 用户提交不包含来源节点的枝化生长请求
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不调用 AgentPort

### Requirement: 校验生长来源节点
系统 SHALL 在创建生长任务前校验来源节点存在、属于当前种子范围且可被用于生长。已归档种子 MUST 不允许发起新的枝化生长。

#### Scenario: 来源节点不存在
- **WHEN** 用户基于不存在的种子或果实发起枝化生长
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 返回可理解的来源节点不可用错误

#### Scenario: 来源节点不属于当前种子范围
- **WHEN** 用户基于不属于当前种子范围的节点发起枝化生长
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不暴露该节点内容

#### Scenario: 已归档种子不可生长
- **WHEN** 用户基于已归档种子或其内容树节点发起枝化生长
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不调用 AgentPort

### Requirement: 校验生成器与果实数量
系统 SHALL 要求枝化生长请求必须选择可用生成器，并限制果实数量。果实数量默认值 MUST 为 3，最大值 MUST 为 6。

#### Scenario: 使用有效生成器和默认数量
- **WHEN** 用户选择可用生成器但未指定果实数量
- **THEN** 系统 MUST 使用默认数量创建生长任务

#### Scenario: 使用有效生成器和合法数量
- **WHEN** 用户选择可用生成器并指定 1 到 6 之间的果实数量
- **THEN** 系统 MUST 接受该数量作为本次生长目标

#### Scenario: 缺少生成器
- **WHEN** 用户未选择生成器发起枝化生长
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不调用 AgentPort

#### Scenario: 生成器不可用
- **WHEN** 用户选择不存在或已停用的生成器发起枝化生长
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不调用 AgentPort

#### Scenario: 果实数量超过上限
- **WHEN** 用户指定超过 6 的果实数量
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 返回可理解的数量限制错误

### Requirement: 校验引用资源授权范围
系统 SHALL 校验用户提交的营养引用和基因引用是否位于本次任务允许访问的范围内。系统 MUST 只把校验通过后的引用范围传递给 AgentPort，MUST 不把真实文件路径作为外部输入直接交给 Agent。

#### Scenario: 引用资源可访问
- **WHEN** 用户提交当前种子范围内可访问的营养引用或基因引用
- **THEN** 系统 MUST 将这些引用加入本次任务授权范围
- **AND** 系统 MUST 允许 Agent 后续通过 Tool 读取授权内容

#### Scenario: 引用资源不可访问
- **WHEN** 用户提交不存在、已归档或不属于授权范围的引用资源
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不把该引用传递给 AgentPort

### Requirement: 维护来源节点生长锁
系统 SHALL 在生长任务运行期间为来源节点维护生长锁。同一来源节点已有进行中任务或生长锁时，系统 MUST 拒绝再次发起生长；其他未锁定节点 MUST 不受影响。

#### Scenario: 创建任务时锁定来源节点
- **WHEN** 系统成功创建生长任务
- **THEN** 系统 MUST 将该任务来源节点标记为正在生长

#### Scenario: 同一节点重复生长
- **WHEN** 用户对一个正在生长的来源节点再次发起枝化生长
- **THEN** 系统 MUST 拒绝创建新的生长任务
- **AND** 系统 MUST 返回节点正在生长的状态信息

#### Scenario: 其他节点可以继续生长
- **WHEN** 某个种子或果实节点正在生长
- **THEN** 系统 MUST 允许用户对其他未锁定且可生长的节点发起枝化生长

#### Scenario: 任务结束释放锁
- **WHEN** 生长任务进入已完成或失败状态
- **THEN** 系统 MUST 释放该任务来源节点的生长锁

#### Scenario: 异常路径释放锁
- **WHEN** 生长任务执行过程中发生未预期异常
- **THEN** 系统 MUST 将任务标记为失败或可感知的失败状态
- **AND** 系统 MUST 释放该任务来源节点的生长锁

### Requirement: 通过 AgentPort 执行果实生成尝试
系统 SHALL 通过 AgentPort 调用枝化生长 Agent 能力。果实数量为 N 时，系统 MUST 在一个生长任务内执行 N 次内部果实生成尝试；第一期这些尝试 MUST 串行执行。

#### Scenario: 数量为五时执行五次尝试
- **WHEN** 用户发起果实数量为 5 的枝化生长任务
- **THEN** 系统 MUST 在该任务内执行 5 次内部果实生成尝试
- **AND** 系统 MUST 为每次尝试调用 AgentPort 的 growth 任务能力

#### Scenario: AgentPort 接收任务上下文和授权范围
- **WHEN** 系统调用 AgentPort 执行果实生成尝试
- **THEN** 系统 MUST 传递任务类型、来源节点引用、用户输入、生成器引用、授权资源范围和本次尝试目标
- **AND** 系统 MUST 不直接把来源 Markdown 全文或真实文件路径作为必需输入塞给 AgentPort

#### Scenario: 突变概率第一期不传递
- **WHEN** 用户提交枝化生长请求
- **THEN** 系统 MUST 不要求突变概率参数
- **AND** 系统 MUST 不把突变概率作为第一期 AgentPort 必需输入

### Requirement: 将候选果实交付果实领域
系统 SHALL 将 Agent 返回的候选内容适配为果实候选，并通过果实领域内部创建能力创建果实。成功创建的果实 MUST 挂载到本次生长来源节点下，初始状态 MUST 由果实领域规则设为候选。

#### Scenario: Agent 返回有效候选内容
- **WHEN** AgentPort 返回可落地的候选果实内容
- **THEN** 系统 MUST 调用果实领域内部创建能力创建果实
- **AND** 系统 MUST 将新果实挂载到生长来源节点下

#### Scenario: Agent 输出不可落成果实
- **WHEN** AgentPort 返回空内容或无法通过果实候选校验的内容
- **THEN** 系统 MUST 将该次内部尝试记录为失败
- **AND** 系统 MUST 继续处理该任务中剩余的内部尝试

#### Scenario: 果实创建失败
- **WHEN** 果实领域拒绝创建某个候选果实
- **THEN** 系统 MUST 将该次内部尝试记录为失败
- **AND** 系统 MUST 不把未落地内容视为成功果实

### Requirement: 判定任务完成或失败
系统 SHALL 根据成功创建并挂载的果实数量判定生长任务结果。至少一个果实成功创建时，任务 MUST 标记为已完成；没有任何果实成功创建时，任务 MUST 标记为失败。部分成功 MUST 不回滚已创建果实。

#### Scenario: 全部尝试成功
- **WHEN** 生长任务的所有内部尝试都成功创建果实
- **THEN** 系统 MUST 将任务标记为已完成
- **AND** 系统 MUST 保留全部已创建果实

#### Scenario: 部分尝试成功
- **WHEN** 生长任务至少一个内部尝试成功且至少一个内部尝试失败
- **THEN** 系统 MUST 将任务标记为已完成
- **AND** 系统 MUST 不回滚已成功创建的果实

#### Scenario: 全部尝试失败
- **WHEN** 生长任务没有任何内部尝试成功创建果实
- **THEN** 系统 MUST 将任务标记为失败
- **AND** 系统 MUST 不创建空果实或占位果实

### Requirement: 保存最近失败输入并支持重试
系统 SHALL 在某个来源节点的生长任务失败且没有生成任何果实时，保存该节点最近一次失败任务的输入，用于前端恢复输入框和用户重试。重试 MUST 基于该来源节点最近一次失败任务输入重新发起生长。

#### Scenario: 保存最近失败输入
- **WHEN** 某个来源节点的生长任务失败且没有任何果实成功创建
- **THEN** 系统 MUST 保存该任务的用户输入、生成器选择、果实数量和资源引用

#### Scenario: 查询最近失败输入
- **WHEN** 前端在用户选中该来源节点时请求恢复最近失败输入
- **THEN** 系统 MUST 返回该节点最近一次失败任务的可重试输入

#### Scenario: 重试最近失败任务
- **WHEN** 用户对某个来源节点触发重试
- **THEN** 系统 MUST 使用该节点最近一次失败任务输入创建新的生长任务
- **AND** 系统 MUST 重新执行果实生成尝试

#### Scenario: 没有失败输入时不能重试
- **WHEN** 用户对没有最近失败任务输入的来源节点触发重试
- **THEN** 系统 MUST 拒绝重试
- **AND** 系统 MUST 返回可理解的无可重试任务错误

### Requirement: 查询生长任务状态
系统 SHALL 提供查询单个生长任务状态的应用能力，供前端轮询使用。查询结果 MUST 能让前端感知任务处于生成中、已完成或失败，并在完成后识别已生成果实。

#### Scenario: 查询生成中任务
- **WHEN** 前端查询一个仍在执行的生长任务
- **THEN** 系统 MUST 返回生成中状态

#### Scenario: 查询已完成任务
- **WHEN** 前端查询一个已完成的生长任务
- **THEN** 系统 MUST 返回已完成状态
- **AND** 系统 MUST 提供本次任务成功创建的果实引用

#### Scenario: 查询失败任务
- **WHEN** 前端查询一个失败的生长任务
- **THEN** 系统 MUST 返回失败状态
- **AND** 系统 MUST 提供用户可感知的失败原因或摘要

#### Scenario: 查询不存在任务
- **WHEN** 前端查询不存在的生长任务
- **THEN** 系统 MUST 返回资源不存在错误

### Requirement: 查询节点生长状态
系统 SHALL 提供按来源节点查询当前是否正在生长的应用能力。该能力 MUST 基于枝化生长任务或生长锁派生，不属于种子或果实 meta。

#### Scenario: 节点正在生长
- **WHEN** 前端查询一个存在进行中生长任务的节点
- **THEN** 系统 MUST 返回该节点正在生长
- **AND** 系统 MUST 能关联到当前进行中的生长任务

#### Scenario: 节点未在生长
- **WHEN** 前端查询一个没有进行中生长任务或生长锁的节点
- **THEN** 系统 MUST 返回该节点未在生长

### Requirement: 提供枝化生长契约文档
系统 SHALL 为枝化生长模块提供顶层 API 与 SQL 契约文档。接口契约 MUST 落到 `docs/api/growth.yaml`，存储结构契约 MUST 落到 `docs/sql/growth.sql`。

#### Scenario: 提供枝化生长 API 契约
- **WHEN** 开发枝化生长 HTTP Controller
- **THEN** 系统 MUST 存在 `docs/api/growth.yaml`
- **AND** 该契约 MUST 对应单一 Growth Controller

#### Scenario: 提供枝化生长 SQL 契约
- **WHEN** 开发枝化生长 SQLite 存储适配器
- **THEN** 系统 MUST 存在 `docs/sql/growth.sql`
- **AND** 该契约 MUST 描述生长任务、生长尝试和生长锁等系统事实结构
