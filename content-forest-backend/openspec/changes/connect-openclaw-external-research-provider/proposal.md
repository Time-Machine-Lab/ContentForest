## Why

当前联网研究默认通过 Codex 外部 Agent Provider 执行，已经能解决大部分搜索场景，但单一 Provider 仍存在不可用、超时或结果质量波动风险。接入 OpenClaw 可作为另一条外部 Agent 研究通道，并在 OpenClaw 失败时自动降级 Codex，提高营养汲取任务的稳定性。

本变更延续 `docs/design/内容森林Agent架构设计文档.md` 中“联网数据受控获取”和 `docs/内容森林第二期开发规划文档.md` 中“外部 Agent 委托研究优先”的方向：ContentForest 只提供研究指令、结构化契约、结果归一化、Trace 和资源清理，不在后端自研平台爬虫或复杂浏览器流程。

## What Changes

- 新增 OpenClaw 外部研究 Provider，接入现有 `NetworkProviderRouter`。
- 新增 OpenClaw 配置读取能力，包括 Gateway URL、鉴权 Token、超时、会话前缀等。
- 默认研究链路支持 OpenClaw 优先、Codex 降级：OpenClaw 失败、超时、输出不可解析或不可用时，系统继续尝试 Codex Provider。
- OpenClaw 每次联网研究调用 MUST 使用独立 session，并由系统在任务结束后删除 session。
- OpenClaw session 删除 MUST 由 Provider/基础设施层在 `finally` 中执行，MUST NOT 暴露给 Agent 自己调用。
- OpenClaw session 删除失败不应覆盖已完成研究结果，但必须进入脱敏 Trace 或 Provider failure，方便定位资源泄漏风险。
- 保持现有本地搜索、PublicWebSearch、BrowserResearch、平台专项 Provider 默认关闭且代码保留。
- 不新增业务 HTTP API，不新增数据库表，不修改营养领域沉淀规则。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `networked-research-module`: 增加 OpenClaw 外部 Agent Provider、OpenClaw/Codex 降级链路、OpenClaw 任务级 session 生命周期和清理要求。

## Impact

- Affected code:
  - `src/agent/networked-research/providers/*`
  - `src/agent/networked-research/provider-router.ts`
  - `src/agent/tools/networked-research-tool.ts`
  - `src/app/config/app-config.ts`
  - `src/app/bootstrap/app-bootstrap.ts`
  - `src/tests/networked-research.test.ts`
  - `src/tests/agent-config.test.ts`
- Affected config:
  - `.env.example`
  - `.env.local`
- Affected docs:
  - Existing top-level architecture direction is already aligned; implementation may update `docs/design/内容森林Agent架构设计文档.md` and `docs/内容森林第二期开发规划文档.md` only if wording needs to mention OpenClaw explicitly.
- API / SQL:
  - No new HTTP API.
  - No SQL schema change.
  - No `docs/api/` or `docs/sql/` update required for this change.
