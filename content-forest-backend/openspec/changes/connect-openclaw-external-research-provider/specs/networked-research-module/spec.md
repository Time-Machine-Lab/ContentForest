## ADDED Requirements

### Requirement: 支持 OpenClaw 外部 Agent 研究 Provider
系统 SHALL 支持将 OpenClaw 作为联网研究模块的外部 Agent Provider。OpenClaw Provider MUST 通过统一 Provider Router 接入，MUST 返回可归一化为现有联网研究结果、受限状态和失败原因的结构化结果，MUST NOT 直接写入营养库、反馈快照、数据库或 Markdown 内容文件。

#### Scenario: OpenClaw Provider 执行营养研究
- **WHEN** 营养汲取 Agent 通过联网研究 Tool 发起研究请求，且 OpenClaw Provider 已启用并配置完整
- **THEN** 系统 MUST 将研究请求、目标平台、期望结果数量和不可编造约束组装为 OpenClaw 研究指令
- **AND** 系统 MUST 将 OpenClaw 返回内容归一化为统一联网研究结果包
- **AND** 系统 MUST 标记结果来源 Provider 为 OpenClaw

#### Scenario: OpenClaw 配置缺失
- **WHEN** OpenClaw Provider 被选为主 Provider 但 Gateway URL 或鉴权 Token 缺失
- **THEN** 系统 MUST 记录 OpenClaw Provider 不可用原因
- **AND** 系统 MUST 继续尝试已配置的降级 Provider

### Requirement: OpenClaw 失败时自动降级 Codex
系统 SHALL 支持 OpenClaw 主 Provider 与 Codex 降级 Provider 的串行降级链路。当 OpenClaw 调用失败、超时、返回空结果、返回不可解析结果或被判定不可用时，系统 MUST 记录 OpenClaw 失败原因，并继续调用 Codex Provider。系统 MUST NOT 因 OpenClaw 单点失败直接终止整个联网研究任务，除非没有任何可用降级 Provider。

#### Scenario: OpenClaw 网络失败后降级 Codex
- **WHEN** OpenClaw Provider 在联网研究中返回网络错误或 Provider 错误
- **THEN** 系统 MUST 在 failures 中记录 OpenClaw 失败原因
- **AND** 系统 MUST 继续调用 Codex Provider
- **AND** 如果 Codex 返回可用结果，系统 MUST 返回 Codex 结果并保留 OpenClaw 失败 Trace

#### Scenario: OpenClaw 超时后降级 Codex
- **WHEN** OpenClaw Provider 超过配置的研究超时时间
- **THEN** 系统 MUST 终止或关闭本次 OpenClaw 调用
- **AND** 系统 MUST 尝试删除本次 OpenClaw session
- **AND** 系统 MUST 继续调用 Codex Provider

#### Scenario: 所有外部 Agent Provider 均不可用
- **WHEN** OpenClaw 和 Codex Provider 均不可用或均失败
- **THEN** 系统 MUST 返回结构化 failures
- **AND** 系统 MUST NOT 编造任何研究结果或营养候选

### Requirement: OpenClaw session 必须由系统清理
系统 SHALL 为每次 OpenClaw 研究调用使用独立 session，并在调用结束后由系统基础设施层删除该 session。session 删除 MUST 在 Provider 或 OpenClaw Client 的 finally 路径执行，MUST NOT 暴露给 Agent 作为可调用工具，MUST NOT 依赖 Agent 自行决定是否删除。

#### Scenario: OpenClaw 成功后删除 session
- **WHEN** OpenClaw Provider 成功完成一次联网研究调用
- **THEN** 系统 MUST 在返回结果前或返回结果流程的 finally 阶段请求删除本次 OpenClaw session
- **AND** 系统 MUST NOT 将删除 session 的操作交给营养研究 Agent 执行

#### Scenario: OpenClaw 失败后仍删除 session
- **WHEN** OpenClaw Provider 在研究过程中失败、超时或返回不可解析结果
- **THEN** 系统 MUST 仍然尝试删除本次 OpenClaw session
- **AND** 系统 MUST 继续执行配置的降级 Provider

#### Scenario: OpenClaw session 删除失败
- **WHEN** OpenClaw 研究调用已经完成但 session 删除失败
- **THEN** 系统 MUST 记录脱敏的 session 清理失败信息
- **AND** 如果研究结果本身可用，系统 MUST NOT 因 session 删除失败丢弃研究结果
- **AND** 系统 MUST NOT 在 Trace 中记录鉴权 Token 或敏感连接信息

### Requirement: OpenClaw 配置必须脱敏且可回退
系统 SHALL 通过环境变量配置 OpenClaw Provider，并支持通过配置回退到 Codex Provider。系统 MUST 在日志、Trace、测试输出和错误消息中隐藏 OpenClaw 鉴权 Token，MUST 支持通过配置切换回 Codex-only 链路。

#### Scenario: 使用 OpenClaw 主 Provider 和 Codex 降级 Provider
- **WHEN** 配置声明 OpenClaw 为主 Provider 且 Codex 为降级 Provider
- **THEN** 系统 MUST 按 OpenClaw 到 Codex 的顺序执行联网研究
- **AND** 系统 MUST 在 Trace 中表达 Provider 调用顺序和降级路径

#### Scenario: 切换回 Codex-only 链路
- **WHEN** 配置声明 Codex 为主 Provider 且未启用 OpenClaw
- **THEN** 系统 MUST 不创建 OpenClaw session
- **AND** 系统 MUST 继续使用现有 Codex 外部研究 Provider

#### Scenario: OpenClaw Token 不泄漏
- **WHEN** OpenClaw 调用失败或配置缺失
- **THEN** 系统 MUST 返回脱敏错误
- **AND** 系统 MUST NOT 在 failures、restrictedStatuses、Trace 或日志摘要中包含完整 OpenClaw Token
