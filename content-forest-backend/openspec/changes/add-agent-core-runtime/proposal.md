## Why

内容森林第一期需要一个可控、可替换的 Agent 底座来支撑后续枝化生长和基因汲取，但当前后端 `src/agent/` 仅有空目录，尚无 AgentPort、Runtime、Tool、Skill、LLM Adapter、输出校验和运行追踪等基础能力。

该变更依据 `docs/design/内容森林Agent架构设计文档.md`、`docs/design/内容森林架构设计文档.md` 和 `docs/内容森林第一期开发规划文档.md`，先实现 Agent 核心底层部分，为后续具体 Tool 与 Skill 开发提供稳定地基。

## What Changes

- 新增 Agent Core 后端能力：提供最底层 AgentPort 入口，支持以任务方式运行 Agent，而不是直接暴露枝化生长或基因汲取业务方法。
- 新增 Agent Runtime 核心链路：接收任务、构建任务上下文、调用 Skill Runtime、执行输出校验、记录运行追踪并返回结果。
- 新增 Tool Registry / Tool Runtime 底座：支持注册和调用 Tool，但本次不实现读取种子、果实、生成器、营养库或基因库等具体业务 Tool。
- 新增 Skill Runtime / Skill 契约底座：支持注册和执行 Skill，但本次不实现枝化生长 Skill、基因汲取 Skill 或生成器执行逻辑。
- 新增 LLM Adapter 抽象与 OpenAI API 兼容实现，用环境变量配置供应商、Base URL、模型和 API Key；默认面向 MiniMax 的 OpenAI 兼容接口，但不在代码或文档中保存真实密钥。
- 新增启动配置校验：当启用真实 LLM Adapter 但缺少供应商、Base URL、模型或 API Key 时，在命令行输出明确提示，并阻止误以为 Agent 已可真实调用模型。
- 新增输出校验与错误包装：对空结果、任务类型不匹配和不可用输出进行基础校验，并返回可理解错误。
- 新增运行追踪能力：记录 Agent 任务开始、Tool 调用、Skill 调用、LLM 调用、输出校验、完成和失败等事件。
- 新增测试用 Fake/Stub 能力：允许在不调用真实 LLM、不实现具体 Tool/Skill 的情况下测试 Agent Core 链路。
- 不新增 HTTP API，不新增数据库表，不实现具体业务 Tool，不实现具体 Skill，不实现多 Agent、长期记忆、任务队列或复杂授权模型。

## Capabilities

### New Capabilities

- `agent-core-runtime`: 定义 AgentPort 最底层任务入口、Agent Runtime、Tool/Skill 注册与调用、LLM Adapter 环境配置、输出校验、运行追踪和错误处理等 Agent Core 底座能力。

### Modified Capabilities

无。

## Impact

- 影响后端 Agent 层：新增 `src/agent/ports`、`src/agent/runtime`、`src/agent/skills` 下的核心契约与运行时实现。
- 影响后端配置层：需要读取并校验 Agent/LLM 相关环境变量，真实密钥只能来自本地环境，不得提交到仓库。
- 影响 `.gitignore` 与示例配置：需要确保 `.env` 等本地密钥文件不会进入 Git，并提供不含真实密钥的示例配置说明。
- 影响依赖：可能需要使用 Node.js 原生 `fetch` 或轻量 HTTP 调用能力访问 OpenAI API 兼容接口；不应引入重型 Agent 框架。
- 影响测试：需要新增 Agent Core、Tool Runtime、Skill Runtime、LLM Adapter 配置校验、输出校验和运行追踪相关测试。
- 不影响 `docs/api/` 和 `docs/sql/`：本变更不新增 HTTP Controller，不新增数据库表，也不改变现有 API 或 SQL 契约。
