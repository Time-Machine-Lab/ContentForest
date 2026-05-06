## 1. 配置与密钥保护

- [ ] 1.1 更新后端 `.gitignore`，确保 `.env`、`.env.local` 等本地密钥文件不会进入 Git
- [ ] 1.2 新增不含真实密钥的环境变量示例文件，覆盖 Agent/LLM 供应商、Base URL、模型和 API Key 占位符
- [ ] 1.3 扩展应用配置读取能力，读取 Agent/LLM 相关环境变量
- [ ] 1.4 实现真实 LLM 配置缺失时的启动提示，提示不得输出真实 API Key

## 2. Agent 核心契约

- [ ] 2.1 定义 Agent 任务类型、任务上下文、任务输入、任务输出、错误结果和运行追踪事件类型
- [ ] 2.2 定义最底层 AgentPort，以通用任务方式运行 Agent
- [ ] 2.3 定义 Tool 契约，支持只读 Tool 语义、任务上下文传入和标准化输出
- [ ] 2.4 定义 Skill 契约，支持任务上下文、Tool 调用入口和标准化输出
- [ ] 2.5 定义 LLM Adapter 契约，隔离模型供应商和调用细节

## 3. Runtime 底座

- [ ] 3.1 实现 Tool Registry，支持注册、查找和列出 Tool
- [ ] 3.2 实现 Tool Runtime，支持调用已注册 Tool、错误包装和 Trace 记录
- [ ] 3.3 实现 Skill Registry / Skill Runtime，支持注册和执行 Skill
- [ ] 3.4 实现通用 Output Validator，覆盖空输出、任务类型不匹配和不可用输出
- [ ] 3.5 实现 Agent Trace 收集能力，记录任务、Tool、Skill、LLM、校验和失败事件
- [ ] 3.6 实现内置 Agent Runtime，串联任务上下文、Skill Runtime、输出校验和结果返回

## 4. LLM Adapter

- [ ] 4.1 实现 Fake LLM Adapter，用于测试和无 Key 开发
- [ ] 4.2 实现 OpenAI API 兼容 LLM Adapter，使用环境变量配置供应商、Base URL、模型和 API Key
- [ ] 4.3 确保 LLM Adapter 错误信息和日志不包含真实 API Key
- [ ] 4.4 确保 MiniMax OpenAI 兼容 Base URL 和模型配置可以通过环境变量覆盖

## 5. 测试与验证

- [ ] 5.1 新增 AgentPort / Agent Runtime 成功运行测试
- [ ] 5.2 新增未知任务类型、缺少 Skill、空输出和 Skill 执行失败测试
- [ ] 5.3 新增 Tool Registry / Tool Runtime 注册、查找、调用和失败包装测试
- [ ] 5.4 新增 LLM 配置校验测试，覆盖缺少供应商、Base URL、模型和 API Key 的提示行为
- [ ] 5.5 新增密钥保护测试或静态检查，确保示例配置不包含真实 Key，且本地 env 文件被忽略
- [ ] 5.6 运行 `npm run typecheck`、`npm run lint`、`npm test` 验证变更
