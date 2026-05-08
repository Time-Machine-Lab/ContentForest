## Why

Agent 任务包含输入上下文、Tool 读取、LLM 交流、结构化输出与失败修复等多个不确定环节；仅靠内存 Trace 不便于后续复盘、定位和排查问题。当前架构文档已经要求 Agent 任务具备可观测性，因此需要补齐可开关的任务级交流日志能力。

## What Changes

- 新增 Agent 任务交流日志能力：每次 Agent 任务提交产出一份独立日志文件。
- 日志默认关闭，通过后端 `.env.local` 中的环境变量开启。
- 日志默认写入 `content-forest-backend/logs`，并允许通过配置覆盖日志目录。
- 日志文件名使用任务开始时间，精确到秒，避免人工排查时难以对应任务。
- 日志内容采用结构化格式记录 Agent 每一次关键输入与输出，包括任务输入、Tool 输入输出摘要、LLM 输入输出摘要、Skill 输出、校验结果和失败原因。
- 日志必须执行脱敏与裁剪，不能泄露 API Key、真实绝对路径或过长正文。
- 不新增 HTTP API，不新增 SQL 表或字段，不改变业务领域状态流转。

## Capabilities

### New Capabilities

- `agent-exchange-logging`: 定义 Agent 任务级交流日志的开启配置、文件落点、命名规则、结构化内容、脱敏规则和失败容错行为。

### Modified Capabilities

无。该能力补齐 Agent Runtime 可观测性，不改变现有业务能力契约。

## Impact

- Affected code:
  - Agent Runtime / Trace：在任务执行过程中收集可落盘的交流日志事件。
  - LLM Adapter / Skill Runtime / Tool Runtime：补齐输入输出摘要记录点。
  - App config / bootstrap：读取日志开关和日志目录配置，默认关闭。
  - Shared logging：新增或复用结构化日志写入能力。
  - Tests：覆盖默认关闭、开启后写入、文件命名、脱敏、失败不影响任务执行等场景。
- APIs: 无新增或变更。
- SQL: 无新增或变更。
- Runtime files: 新增本地运行日志目录 `logs/`，该目录应被 Git 忽略。
