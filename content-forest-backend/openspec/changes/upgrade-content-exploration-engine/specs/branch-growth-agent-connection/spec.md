## ADDED Requirements

### Requirement: AgentPort 接收探索路线与参考计划
系统 SHALL 在调用枝化生长 AgentPort 时传递解空间摘要、选中探索路线、参考计划和突变算子。AgentPort 输入 MUST 保持现有资源授权边界，并 MUST 不因路线元数据而允许 Agent 读取未授权资源。

#### Scenario: 传递路线元数据
- **WHEN** Growth 领域调用 AgentPort 执行某个果实生成尝试
- **THEN** 系统 MUST 在输入中提供本次 attempt 的选中探索路线、参考计划摘要和突变算子
- **AND** AgentPort MUST 能将这些信息交给内置枝化生长 Skill

#### Scenario: 路线不扩大授权范围
- **WHEN** 选中探索路线引用某类证据或平台线索
- **THEN** AgentPort MUST 仍只允许 Agent 访问授权范围中的来源节点、生成器、营养、临时营养卡片、基因和反馈上下文
- **AND** 系统 MUST NOT 因路线文本中出现资源名称而自动授权额外资源

### Requirement: AgentPort 保留平台推断来源
系统 SHALL 在 AgentPort 输入或 Trace 中保留平台推断来源。平台推断来源 MUST 区分生成器线索、用户显式要求和系统推断，便于排查生成内容为什么偏向某个平台或内容形态。

#### Scenario: 生成器线索进入 AgentPort
- **WHEN** 平台或内容形态由生成器名称、描述或 Skill 方法论推断
- **THEN** AgentPort 输入或 Trace MUST 标记推断来源为生成器
- **AND** 系统 MUST 不把该线索写成生成器领域系统事实

#### Scenario: 系统推断进入 AgentPort
- **WHEN** 平台或内容形态由系统从种子、营养、基因或反馈中推断
- **THEN** AgentPort 输入或 Trace MUST 标记推断来源为系统推断
- **AND** 内置 Skill MUST 将该推断视为可调整策略线索而不是不可违背事实

### Requirement: AgentPort 支持路线级生成进度
系统 SHALL 允许 AgentPort 在枝化生长执行过程中上报用户可理解的路线级进度。路线级进度 MAY 表达平台推断、解空间建图、选择探索路线、执行生成器和封装候选果实等实际创作动作。

#### Scenario: 上报选择路线步骤
- **WHEN** Agent 完成解空间建图或路线选择
- **THEN** 系统 MUST 能记录用户可理解的进度步骤
- **AND** 该步骤名称 MUST 不直接暴露 tool_called、llm_called 或 skill_called 等工程事件

#### Scenario: Trace 记录工程细节
- **WHEN** Agent 运行中产生路线、Tool、LLM 或校验相关工程细节
- **THEN** 系统 MUST 将工程细节保留在 Trace 或日志中
- **AND** 系统 MUST 不把完整工程细节直接返回为用户可见路径图
