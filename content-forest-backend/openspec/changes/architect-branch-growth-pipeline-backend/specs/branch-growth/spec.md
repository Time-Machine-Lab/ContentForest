## ADDED Requirements

### Requirement: 枝化生长任务接收管线参数
系统 SHALL 在发起枝化生长任务时支持管线参数。管线参数 MUST 包含搜索模式和突变激进程度，且 MUST 允许缺省以便系统推荐。

#### Scenario: 创建包含管线参数的生长任务
- **WHEN** 用户提交包含搜索模式和突变激进程度的枝化生长请求
- **THEN** 系统 MUST 保存或记录该任务使用的管线参数
- **AND** 系统 MUST 在内部 attempt 执行时使用这些参数

#### Scenario: 缺省管线参数
- **WHEN** 用户提交不包含搜索模式或突变激进程度的枝化生长请求
- **THEN** 系统 MUST 为缺省参数生成推荐值
- **AND** 系统 MUST 不拒绝该请求

### Requirement: 查询生长任务返回用户路径图
系统 SHALL 在查询生成中生长任务时返回用户可见生成路径图。路径图 MUST 让前端展示当前正在执行的实际工作、已完成步骤和新增子步骤。路径图 MUST NOT 直接包含 Agent Trace、Tool 调用、LLM 调用或 Skill 调用日志。

#### Scenario: 查询生成中任务路径
- **WHEN** 前端查询生成中的生长任务
- **THEN** 系统 MUST 返回用户可见路径图步骤集合或等价进度结构
- **AND** 每个步骤 MUST 能表达待执行、执行中、已完成或失败状态

#### Scenario: 查询路径图不包含调试事件
- **WHEN** 生长任务存在 Agent Trace 或工程日志
- **THEN** 系统 MUST 不把 task_started、skill_called、tool_called、llm_called 等事件作为 pathGraph 步骤返回
- **AND** 系统 MAY 在调试日志中保留这些事件

#### Scenario: 查询完成任务不要求展示路径
- **WHEN** 前端查询已完成或失败的生长任务
- **THEN** 系统 MAY 返回路径摘要
- **AND** 前端不需要将路径图作为果实正式内容展示
