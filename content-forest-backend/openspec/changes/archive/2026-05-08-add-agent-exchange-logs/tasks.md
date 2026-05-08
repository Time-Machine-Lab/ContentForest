## 1. 配置与运行目录

- [x] 1.1 确认本变更不新增或修改 `docs/api` 与 `docs/sql` 契约
- [x] 1.2 更新后端 `.gitignore`，确保 `logs/` 与本地 Agent 交流日志文件不会进入 Git
- [x] 1.3 更新环境变量示例文件，新增 Agent 交流日志开关、日志目录和正文裁剪上限示例值
- [x] 1.4 扩展应用配置读取能力，默认关闭 Agent 交流日志，并支持从 `.env.local` 开启
- [x] 1.5 在后端启动装配中将 Agent 交流日志配置注入 Agent Runtime

## 2. 日志模型与写入器

- [x] 2.1 定义 Agent 交流日志文件结构，覆盖任务信息、事件列表、最终结果和失败摘要
- [x] 2.2 实现 Agent 交流日志事件模型，覆盖 task、skill、tool、llm、validator、runtime 等阶段
- [x] 2.3 实现日志文件命名规则，使用精确到秒的时间戳并处理同秒冲突
- [x] 2.4 实现日志写入器，支持创建日志目录、写入任务级 JSON 文件和捕获写入失败
- [x] 2.5 确保日志写入失败不会改变 Agent 任务成功或失败结果

## 3. 脱敏与裁剪

- [x] 3.1 实现日志内容脱敏工具，覆盖 API Key、Authorization Header、Bearer Token 和明显密钥形态文本
- [x] 3.2 实现真实本地绝对路径脱敏，覆盖 Windows 与 Unix 常见路径格式
- [x] 3.3 实现超长正文裁剪，支持通过配置控制单段内容最大字符数
- [x] 3.4 确保 Trace 与 Agent 交流日志中都不会暴露真实 API Key、真实绝对路径或过长正文

## 4. Agent Runtime 集成

- [x] 4.1 在 AgentRuntime 任务开始、完成和失败阶段记录交流日志事件
- [x] 4.2 在 SkillRuntime 或内置 Skill 执行边界记录 Skill 输入输出摘要
- [x] 4.3 在 ToolRuntime 调用边界记录 Tool 输入输出摘要和失败原因
- [x] 4.4 在 LLM Adapter 调用边界记录 LLM 输入输出摘要和失败原因
- [x] 4.5 在 Output Validator 与结构化输出修复流程中记录校验结果、修复尝试和失败原因
- [x] 4.6 确保日志只记录脱敏后的输入输出，不改变现有 AgentPort 返回结构

## 5. 测试与验证

- [x] 5.1 新增配置测试，覆盖默认关闭、开启日志、配置日志目录和配置裁剪上限
- [x] 5.2 新增日志写入器测试，覆盖文件命名、同秒冲突、目录创建和写入失败容错
- [x] 5.3 新增脱敏与裁剪测试，覆盖密钥、Authorization Header、Windows/Unix 绝对路径和超长正文
- [x] 5.4 新增 Agent Runtime 测试，覆盖成功任务开启日志后写入完整事件
- [x] 5.5 新增 Agent Runtime 测试，覆盖失败任务开启日志后写入失败阶段和失败原因
- [x] 5.6 新增边界测试，验证日志关闭时不写文件，日志写入失败不影响 Agent 任务结果
- [x] 5.7 运行 `npm run typecheck`、`npm run lint`、`npm test` 和 `npm run build`
