## Context

内容森林 Agent Runtime 已具备任务 Trace，但 Trace 当前主要随 Agent 运行结果返回，缺少可持久化的任务级交流日志。枝化生长和基因汲取都涉及 Tool 读取、LLM 输入输出、结构化校验和修复重试，一旦任务失败或输出异常，需要能回看该任务完整的 Agent 交流过程。

现有架构文档已经明确 Agent 层需要记录任务开始、Tool 调用、LLM 调用、输出校验和失败原因；后端开发规范也要求关键用户动作、生长任务和 Agent 调用具备结构化日志。本变更将该要求落为可开关、可本地排查的 Agent 任务交流日志能力。

## Goals / Non-Goals

**Goals:**

- 通过环境变量控制 Agent 交流日志是否开启，默认关闭。
- 每次 Agent 任务提交生成一份独立日志文件。
- 默认日志目录为后端项目下的 `logs/`，并支持配置覆盖。
- 日志文件名以任务开始时间为主，精确到秒，方便按时间排查。
- 结构化记录 Agent 每个关键输入和输出，包括任务输入、Tool 输入输出、LLM 输入输出、Skill 输出、输出校验和失败原因。
- 对日志内容执行脱敏与裁剪，避免泄露 API Key、真实绝对路径或超长正文。
- 日志写入失败不得影响 Agent 任务执行结果。

**Non-Goals:**

- 不新增 HTTP API 或日志查看页面。
- 不新增 SQL 表，不把 Agent 日志写入数据库。
- 不接入外部日志平台、链路追踪系统或监控告警系统。
- 不实现用户级日志权限管理。
- 不改变 Agent 任务执行策略、Tool 授权边界或业务领域状态流转。

## Decisions

### Decision 1: 使用任务级 JSON 日志文件

每个 Agent 任务生成一份结构化 JSON 日志文件。文件包含任务基本信息、运行配置摘要、事件列表、最终结果摘要和失败信息。事件列表按发生顺序记录交流过程。

替代方案是使用普通文本日志或全局 JSONL 文件。普通文本便于阅读但不利于程序化排查；全局 JSONL 会把多个任务交织在一起，后续定位单次任务不够直接。任务级 JSON 文件更符合用户“每次任务提交产出一份日志”的要求。

### Decision 2: 环境变量默认关闭

新增 Agent 日志配置，默认不写交流日志。建议配置项：

- `CONTENT_FOREST_AGENT_EXCHANGE_LOG_ENABLED=false`
- `CONTENT_FOREST_AGENT_EXCHANGE_LOG_DIR=logs`
- `CONTENT_FOREST_AGENT_EXCHANGE_LOG_MAX_CONTENT_CHARS=4000`

`.env.local` 可配置开启，本地示例文件只保留占位说明，不包含真实密钥。业务模块不得直接读取环境变量，配置仍由 app config 统一读取。

### Decision 3: 文件命名以本地时间戳为主

日志文件名使用任务开始时间，格式建议为 `YYYYMMDD-HHmmss.json`。如果同一秒内多个 Agent 任务并发导致文件名冲突，写入器必须追加短后缀或任务标识片段，避免覆盖已有日志，例如 `YYYYMMDD-HHmmss-2.json`。

该设计保留用户按秒定位日志的体验，同时避免并发任务丢失日志。

### Decision 4: 日志事件采用统一交流事件模型

日志事件不直接绑定某个 Skill 或 Tool 的内部实现，而采用通用字段表达：

- 时间：事件发生时间。
- 阶段：task、skill、tool、llm、validator、runtime。
- 方向：input、output、error、info。
- 名称：任务类型、Skill 名称、Tool 名称或 LLM 调用名称。
- 内容：脱敏后的输入输出摘要或正文。
- 结果：成功、失败、跳过等状态。

这样后续替换 Agent Runtime 或新增 Skill 时，可以复用同一日志格式。

### Decision 5: 日志内容先脱敏再落盘

日志写入前必须统一经过脱敏与裁剪。脱敏范围至少包括：

- LLM API Key、Authorization Header、Bearer Token。
- Windows / Unix 真实绝对路径。
- 明显密钥形态的长 token。
- 超过配置上限的正文内容。

日志应优先保留排查所需信息，例如任务类型、资源 ID、Tool 名称、错误原因、结构化校验错误；对于长 Markdown、营养正文、果实正文和模型输出，应保留裁剪后的内容与长度信息。

### Decision 6: 日志写入是旁路能力

Agent 交流日志是调试与排查能力，不是业务事实。日志写入失败必须被捕获并记录为普通运行警告，不能导致枝化生长或基因汲取任务失败。

## Risks / Trade-offs

- [Risk] 日志内容可能包含用户创作正文或敏感资料 → Mitigation：默认关闭，并执行脱敏、裁剪和 Git 忽略。
- [Risk] 开启日志后本地磁盘增长较快 → Mitigation：第一期只提供开关和目录配置，后续可增加保留天数或清理命令。
- [Risk] 同一秒并发任务产生命名冲突 → Mitigation：使用时间戳为主，冲突时追加短后缀，不覆盖已有文件。
- [Risk] 过度记录导致代码侵入 Agent Runtime → Mitigation：通过统一 AgentExchangeLogger / Recorder 注入 Runtime，Tool、Skill、LLM 只上报事件，不直接处理文件。
- [Risk] 日志写入异常影响任务执行 → Mitigation：写入器必须吞掉自身异常并转为 Trace 警告。

## Migration Plan

该变更不迁移数据，不修改 API，不修改 SQL。上线后默认不产生日志；开发者在 `.env.local` 中开启后，后端启动时确保 `logs/` 目录存在，并在每次 Agent 任务结束后写入一份日志。

回滚时关闭配置或移除日志写入器即可；已有日志文件属于本地运行产物，可由开发者自行清理。

## Open Questions

暂无阻塞问题。后续可单独讨论是否增加日志轮转、日志查看页面或导出问题排查包。
