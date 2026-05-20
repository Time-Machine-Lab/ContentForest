## Context

内容森林第二期的营养库活化依赖“外部 Agent 委托研究”能力。现有实现已经将联网研究封装到 `networked_research` Tool 和 `NetworkProviderRouter` 中，并通过 `CodexExternalResearchProvider` 调用外部 Codex Responses 兼容接口。该方向与 `docs/design/内容森林Agent架构设计文档.md` 中“联网数据受控获取 Tool”和 `docs/内容森林第二期开发规划文档.md` 中“营养汲取不自研复杂搜索/浏览器操作”的设计一致。

OpenClaw 同样属于外部 Agent Provider。它具备搜索与浏览器访问能力，但使用会话承载上下文。如果后端长期保留大量 OpenClaw session，可能造成 OpenClaw 侧内存占用持续上涨。因此本次接入的关键不是让 Agent 学会删除会话，而是把 session 生命周期收敛到 Provider 基础设施层。

## Goals / Non-Goals

**Goals:**

- 增加 `OpenClawExternalResearchProvider`，作为 `NetworkProviderRouter` 中的研究 Provider。
- 支持 OpenClaw 优先、Codex 自动降级的研究链路。
- 每次 OpenClaw 研究调用创建独立 session，并由系统在调用结束后删除。
- OpenClaw session 删除逻辑必须在 Provider/Client 层执行，不暴露给 Agent Tool，不由 Agent 自己决定。
- OpenClaw 结果复用现有 `RawNetworkResearchItem`、restricted status、failure 和 trace 结构。
- OpenClaw 配置通过环境变量提供，并写入 `.env.example` 和 `.env.local`。

**Non-Goals:**

- 不新增营养研究 HTTP API。
- 不新增数据库表或持久化 OpenClaw session。
- 不让 ContentForest 直接维护 OpenClaw 内部浏览器步骤、平台 DOM 策略或登录状态。
- 不让 Agent 直接获得 OpenClaw Gateway Token、session 删除能力或任意 OpenClaw 管理能力。
- 不删除现有 Codex Provider；Codex 是 OpenClaw 失败时的降级 Provider。

## Decisions

### Decision 1: OpenClaw 作为外部 Agent Provider，而不是 Agent Tool

OpenClaw 应接在 `NetworkProviderRouter` 下，和 Codex Provider 平级。`NutrientResearchSkill` 仍只调用 `networked_research` Tool；Tool 仍只接收研究请求、目标平台和结果数量等业务参数，不暴露 OpenClaw 的 session、Gateway、Token 或具体协议。

替代方案是把 OpenClaw 当成 Agent 可调用 Tool 暴露给营养研究 Agent。该方案会让 Agent 看到过多基础设施细节，也会诱导 Agent 自己管理 session，不符合“删除会话不要让 Agent 自己执行”的要求。

### Decision 2: 默认 Provider 顺序为 OpenClaw -> Codex

当配置选择 OpenClaw 或多 Provider 模式时，Router 首先调用 OpenClaw。若 OpenClaw 返回不可用、超时、网络错误、结构化输出无效或空结果，Router 记录失败原因并继续尝试 Codex。最终结果仍经过现有归一化、去重、排序和 maxResults 截断。

如果 OpenClaw 成功但只返回 restricted statuses 或候选结果，是否继续调用 Codex由现有 Router 行为和结果数量策略决定。第一版建议只在 OpenClaw 明确失败或无可用研究内容时降级，避免每次研究都双倍消耗外部 Agent。

### Decision 3: OpenClaw session 采用单次研究调用生命周期

第一版每次 OpenClaw Provider 调用生成一个独立 session key，例如：

```text
content-forest-{taskId-or-runId}-{short-random}
```

Provider 调用流程：

```text
build sessionKey
  -> call OpenClaw agent
  -> parse structured result
  -> map to RawNetworkResearchItem
  -> finally delete OpenClaw session
```

不把 OpenClaw session 和营养研究会话长期绑定。这样牺牲了一点跨轮 OpenClaw 上下文复用，但能显著降低外部会话堆积和内存占用风险，也更容易保证异常路径清理。

### Decision 4: session 删除失败只记录，不覆盖研究主结果

如果 OpenClaw 研究成功但 session 删除失败，系统应返回研究结果，同时记录一条脱敏 failure 或 trace 摘要，标记 cleanup failed。这样用户不会因为清理失败丢失研究结果，开发者仍能定位 OpenClaw 侧资源泄漏风险。

如果 OpenClaw 研究失败，`finally` 仍必须执行删除。删除失败和研究失败都应被记录，但对用户展示时优先说明研究失败原因。

### Decision 5: OpenClaw Client 封装协议差异

新增轻量 `OpenClawGatewayClient` 或等价适配器封装 OpenClaw 协议细节。Provider 只依赖以下能力：

- 执行研究指令。
- 接收 OpenClaw 返回文本或结构化结果。
- 删除指定 session。
- 超时、中断、鉴权失败和网络失败映射为统一 Provider 错误。

如果 OpenClaw 使用 WebSocket JSON-RPC，Client 负责连接、发送 `agent` 方法、等待最终响应、调用 `sessions.delete`，并在超时时关闭连接。Provider 不直接拼 WebSocket 消息。

### Decision 6: 输出契约复用 Codex Provider 的研究包

OpenClaw 返回结果应尽量收敛为与 Codex Provider 相同的“研究包”结构：

- summary
- items
- depositableBlocks
- limitations

若 OpenClaw 无法原生约束 JSON 输出，Provider 可在本地做一次宽松解析：优先解析 JSON，失败时把文本作为 summary/depositableBlock 候选，但必须避免把不可验证内容标记为真实 observed case。

### Decision 7: 配置分层

建议新增配置项：

```env
CONTENT_FOREST_RESEARCH_PROVIDER=openclaw-external-agent
CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER=codex-external-agent
CONTENT_FOREST_OPENCLAW_GATEWAY_URL=ws://localhost:18789/
CONTENT_FOREST_OPENCLAW_AUTH_TOKEN=
CONTENT_FOREST_OPENCLAW_TIMEOUT_MS=180000
CONTENT_FOREST_OPENCLAW_SESSION_PREFIX=content-forest
CONTENT_FOREST_OPENCLAW_DELETE_SESSION_ON_FINISH=true
```

`CONTENT_FOREST_RESEARCH_PROVIDER=openclaw-external-agent` 表示 OpenClaw 主链路。`CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER=codex-external-agent` 表示 OpenClaw 失败后继续调用 Codex。若 OpenClaw 配置缺失，应记录 OpenClaw provider unavailable，并降级 Codex。

## Risks / Trade-offs

- OpenClaw session 删除接口不可用 -> 在 `finally` 中重试有限次数或记录 cleanup failure；不把删除能力交给 Agent。
- OpenClaw 返回非结构化文本 -> Provider 做宽松解析和降级标记；必要时返回 provider_error 并降级 Codex。
- OpenClaw 调用慢于 Codex -> 使用独立 timeout；超时后关闭连接、删除 session，并降级 Codex。
- OpenClaw 和 Codex 同时不可用 -> 返回现有结构化 failures，不伪造研究结果。
- 双 Provider 降级增加耗时 -> 仅在 OpenClaw 失败或无可用结果时调用 Codex，不默认并行。
- Token 泄漏风险 -> 配置仅从环境读取，trace 和日志必须脱敏，不记录完整 Gateway token。

## Migration Plan

1. 增加 OpenClaw 配置读取和 `.env.example` 示例。
2. 实现 OpenClaw Gateway Client，并提供 fake client 便于测试成功、失败、超时和删除会话。
3. 实现 `OpenClawExternalResearchProvider`，接入现有研究包解析和结果归一化。
4. 调整默认 Provider 构建逻辑，支持 OpenClaw 主 Provider + Codex fallback。
5. 增加测试覆盖 Provider 顺序、OpenClaw 失败降级 Codex、session 删除成功、session 删除失败记录、Token 不泄漏。
6. 更新必要顶层文档表述，使“外部 Agent 委托研究”明确包含 OpenClaw 和 Codex 两类实现。

Rollback 策略：将 `CONTENT_FOREST_RESEARCH_PROVIDER` 改回 `codex-external-agent`，即可绕过 OpenClaw Provider，继续使用现有 Codex 链路。

## Open Questions

- OpenClaw Gateway 的实际地址、鉴权 header 或 token 字段名需要由本地环境确认。
- OpenClaw `agent` 响应是否能稳定要求 JSON 输出，还是需要 Provider 做额外文本解析兜底。
- OpenClaw session 删除接口是否需要先 list 再 delete，还是可直接按 sessionKey 删除。
