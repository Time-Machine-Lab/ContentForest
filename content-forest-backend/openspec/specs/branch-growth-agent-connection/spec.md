## Purpose

定义枝化生长领域与 AgentPort 的异步连接规则，包括运行中任务创建、单果实尝试拆分、职责边界、后台归结、轮询进度和失败输入重试。

## Requirements

### Requirement: 异步创建枝化生长任务
系统 SHALL 在用户发起枝化生长时立即创建处于运行中的生长任务，并在不等待全部 Agent 生成尝试完成的情况下返回任务详情。系统 MUST 在任务创建时校验种子、来源节点、生成器、果实数量和授权资源引用，并为来源节点加上生长锁。

#### Scenario: 创建运行中的生长任务
- **WHEN** 用户提交有效的枝化生长请求
- **THEN** 系统 MUST 创建状态为 `running` 的生长任务
- **AND** 系统 MUST 返回包含该任务详情的创建响应
- **AND** 系统 MUST 在后台继续执行果实生成尝试

#### Scenario: 来源节点已被锁定
- **WHEN** 用户从已经处于生长中的来源节点再次发起枝化生长
- **THEN** 系统 MUST 拒绝本次请求
- **AND** 系统 MUST 不创建新的生长任务

### Requirement: 按果实数量拆分 Agent 生成尝试
系统 SHALL 将一次枝化生长中的果实数量拆分为多个果实生成尝试。每个尝试 MUST 只请求 Agent 生成一个候选果实，并向 AgentPort 提交 `growth` 类型任务。

#### Scenario: 请求生成多个果实
- **WHEN** 生长任务要求生成 5 个果实
- **THEN** 系统 MUST 最多创建并执行 5 个果实生成尝试
- **AND** 每个尝试提交给 Agent 的目标果实数量 MUST 为 1
- **AND** 每个尝试 MUST 拥有独立的尝试状态和失败原因

#### Scenario: Agent 生成候选果实成功
- **WHEN** 某个果实生成尝试从 Agent 收到合法候选果实
- **THEN** 系统 MUST 调用果实领域新增能力创建果实
- **AND** 新果实 MUST 挂载到本次生长任务的来源节点下
- **AND** 系统 MUST 将该尝试标记为成功并记录对应果实标识

#### Scenario: Agent 生成候选果实失败
- **WHEN** 某个果实生成尝试收到 Agent 失败结果或不可落地的候选果实
- **THEN** 系统 MUST 将该尝试标记为失败
- **AND** 系统 MUST 记录用户可感知的失败原因
- **AND** 系统 MUST 继续按任务规则处理其他尝试

### Requirement: 保持 Growth 与 Agent 的职责边界
系统 SHALL 由 Growth 领域维护生长任务、尝试状态、来源节点生长锁、失败输入和果实落地。Agent MUST 只接收授权范围内的任务上下文引用并返回候选果实结构，MUST NOT 直接创建果实、更新任务状态、释放生长锁或读取 Growth 未授权的资源。

#### Scenario: Growth 向 Agent 提交授权上下文
- **WHEN** Growth 执行某个果实生成尝试
- **THEN** 系统 MUST 向 AgentPort 提交来源节点引用、用户输入、生成器引用、授权资源引用、详情参数和单果实生成目标
- **AND** 系统 MUST 不在 Growth 中读取营养库或基因库 Markdown 正文

#### Scenario: Agent 返回候选结果
- **WHEN** AgentPort 返回候选果实结构
- **THEN** Growth MUST 校验候选结果是否可落地
- **AND** Growth MUST 只把可落地的 Markdown、摘要和基因标签交给果实领域

### Requirement: 后台执行完成后归结任务状态
系统 SHALL 在后台执行完成后根据成功果实数量归结生长任务状态。只要至少一个果实成功创建，任务 MUST 标记为完成；只有没有任何果实成功创建时，任务 MUST 标记为失败。系统 MUST 不回滚已经创建的果实。

#### Scenario: 部分尝试成功
- **WHEN** 一个生长任务中至少一个尝试成功且至少一个尝试失败
- **THEN** 系统 MUST 将生长任务标记为 `completed`
- **AND** 系统 MUST 保留已创建果实
- **AND** 系统 MUST 不因为失败尝试回滚成功果实

#### Scenario: 全部尝试失败
- **WHEN** 一个生长任务没有创建任何果实
- **THEN** 系统 MUST 将生长任务标记为 `failed`
- **AND** 系统 MUST 保存该来源节点最近一次失败任务的输入

#### Scenario: 后台执行结束
- **WHEN** 生长任务被归结为完成或失败
- **THEN** 系统 MUST 释放该来源节点的生长锁
- **AND** 后续请求 MUST 能够从该来源节点重新发起枝化生长

### Requirement: 支持前端轮询生长进度
系统 SHALL 通过现有查询能力支持前端轮询生长任务和来源节点状态。任务详情 MUST 反映当前任务状态、尝试列表、成功果实标识和失败原因；来源节点状态 MUST 反映该节点当前是否正在生长。

#### Scenario: 轮询运行中任务
- **WHEN** 前端查询仍在后台执行的生长任务
- **THEN** 系统 MUST 返回 `running` 状态
- **AND** 系统 MUST 返回当前已创建的尝试和已成功创建的果实标识

#### Scenario: 轮询来源节点状态
- **WHEN** 前端查询某个来源节点的生长状态
- **THEN** 系统 MUST 返回该节点是否存在生长锁
- **AND** 如果存在生长锁，系统 MUST 返回对应生长任务标识

### Requirement: 保留最近失败输入用于重试
系统 SHALL 在生长任务完全失败时保存来源节点最近一次失败任务的输入。用户从该来源节点重试时，系统 MUST 使用最近失败输入重新创建新的生长任务。

#### Scenario: 查询最近失败输入
- **WHEN** 来源节点最近一次生长任务完全失败
- **THEN** 系统 MUST 能够返回该失败任务的用户输入、生成器、果实数量、引用资源、详情参数和失败原因

#### Scenario: 重试最近失败任务
- **WHEN** 用户请求重试来源节点最近一次失败任务
- **THEN** 系统 MUST 基于最近失败输入创建新的运行中生长任务
- **AND** 系统 MUST 按异步生长任务规则继续后台执行

### Requirement: AgentPort 接收本轮生长简报和搜索计划
系统 SHALL 在调用枝化生长 AgentPort 时传递本轮生长简报、搜索模式、突变激进程度和 attempt 级突变计划。AgentPort 输入 MUST 保持资源授权边界。

#### Scenario: 传递本轮生长简报
- **WHEN** Growth 领域调用 AgentPort 执行内部 attempt
- **THEN** 系统 MUST 提供本轮生长简报或其结构化摘要
- **AND** 系统 MUST 不直接暴露真实本地文件路径

#### Scenario: 传递动态突变计划
- **WHEN** 创作搜索层为 attempt 生成突变计划
- **THEN** 系统 MUST 将该突变计划传递给 AgentPort
- **AND** AgentPort MUST 能区分继承、变异和规避意图

### Requirement: AgentPort 可上报生成路径子步骤
系统 SHALL 允许 AgentPort 在枝化生长执行过程中上报生成路径子步骤或步骤状态更新。

#### Scenario: 上报步骤完成
- **WHEN** Agent 完成某个生成子步骤
- **THEN** 系统 MUST 能记录该步骤已完成
- **AND** 后续任务状态查询 MUST 能反映该进度

#### Scenario: 上报新增步骤
- **WHEN** Agent 根据生成器执行情况新增子步骤
- **THEN** 系统 MUST 能将该步骤追加到生成路径图
- **AND** 该步骤 MUST 归属于当前生长任务或 attempt
