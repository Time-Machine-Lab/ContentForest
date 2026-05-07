## Why

内容森林已经具备 Agent Core Runtime、生成器管理、果实落地与枝化生长领域模块，但还缺少真正执行“生成一个候选果实”的内置 Agent Skill。该变更用于补齐枝化生长任务中的智能生成环节，让 Growth 领域能够通过 AgentPort 获得严格结构化、可校验、可落地的候选果实结果。

## What Changes

- 新增内置枝化生长 Agent Skill，作为 Agent 系统能力的一部分，由后端应用装配注册，不作为用户上传生成器管理。
- 新增生成器 Skill 文件夹读取能力，Agent 能读取生成器 Skill 的 `SKILL.md`、目录清单和必要附件摘要。
- 新增生成器 Skill 脚本受控执行能力，当生成器 Skill 需要使用其文件夹内 JS 脚本时，通过受控 Tool 执行，而不是由 Agent 直接访问文件系统或任意运行命令。
- 新增候选果实结构化输出机制，枝化生长 Skill 每次 Agent 调用只返回一个候选果实结构体，不直接保存果实、不调用 FruitService。
- 新增候选果实 Schema 校验与自检修复机制，确保输出满足 Growth 领域可消费的结构化数据要求；多次修复失败时将本次果实生成尝试视为失败。
- 新增 Tool Calling 风格的候选果实提交约束，优先通过强制提交工具收敛模型输出，再由本地 Schema 校验兜底。
- 新增枝化生长 Skill 所需只读 Tool 契约，包括读取来源节点内容、读取生成器 Skill、读取授权营养、读取授权基因、受控执行生成器脚本。
- 不新增 HTTP API，不新增数据库表，不改变 Growth 领域任务状态、尝试记录、生长锁、重试和果实落地规则。

## Capabilities

### New Capabilities

- `branch-growth-agent-skill`: 定义内置枝化生长 Agent Skill、生成器 Skill 执行边界、候选果实结构化输出、自检修复和只读/受控 Tool 契约。

### Modified Capabilities

无。

## Impact

- 影响后端 Agent 层：新增内置 Skill、候选果实 Schema、自检修复器、生成器 Skill 执行 Tool 和相关测试。
- 影响 Growth 模块集成：Growth 领域继续通过 AgentPort 调用 `growth` 任务，并消费结构化候选果实结果；不改变其任务批次、锁和落地规则。
- 影响 Generator 内容访问：需要支持读取生成器 Skill 文件夹结构和受控脚本文件，但不改变生成器上传、停用、重新上传等领域能力。
- 影响安全边界：生成器脚本执行必须限制在生成器 Skill 文件夹内，限制超时、输出大小和可访问路径；真实文件路径不得暴露给模型作为可自由操作输入。
- 影响测试：需要覆盖结构化输出成功、Schema 校验失败、修复成功/失败、生成器脚本执行成功/失败、越权脚本拒绝和 Growth 可消费输出。
