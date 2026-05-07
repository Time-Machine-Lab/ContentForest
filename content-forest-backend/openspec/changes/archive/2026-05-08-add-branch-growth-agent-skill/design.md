## Context

当前后端已经具备 Agent Core Runtime、AgentPort、Tool/Skill/LLM Adapter 底座，以及枝化生长领域模块。枝化生长领域负责生长任务、节点锁、尝试记录、失败重试和调用 FruitService 落地果实，但它仍缺少一个能真正把来源节点、生成器、营养、基因经验编排成“候选果实”的内置 Agent Skill。

根据 `docs/design/内容森林Agent架构设计文档.md`，Agent 层是架构能力层，不拥有业务事实；根据 `docs/design/domain/枝化生长领域模块设计文档.md`，生成器只负责 payload，枝化生长 Skill 负责候选果实封装，Growth 领域负责系统事实落地。本设计承接该边界。

本变更中的“Skill”有两类来源：

- 内置枝化生长 Skill：内容森林 Agent 系统的一部分，随后端代码发布，在应用装配时注册到 SkillRegistry。
- 外部生成器 Skill：用户上传并由生成器模块管理的文件夹资源，运行时由 Agent 通过 Tool 按授权读取和执行。

因此，Agent 加载枝化生长 Skill 的方式是“内置注册”，不是从生成器目录读取；Agent 加载生成器 Skill 的方式是“按任务引用从生成器 Skill 文件夹读取”。

## Goals / Non-Goals

**Goals:**

- 实现内置枝化生长 Agent Skill，用于一次 Agent `growth` 任务生成一个候选果实结构体。
- 支持 Agent 读取生成器 Skill 文件夹，包括 `SKILL.md`、目录清单、附件摘要和允许的脚本入口。
- 支持当生成器 Skill 需要 JS 脚本时，通过受控 Tool 执行脚本，并把脚本结果作为生成器 payload 输入后续封装流程。
- 以结构化候选果实作为枝化生长 Skill 的唯一成功输出，供 Growth 领域校验和落地。
- 建立严格输出自检机制：Tool Calling 约束、Schema 校验、修复重试、失败降级。
- 保证枝化生长 Skill 不直接保存果实、不写文件、不写数据库、不释放生长锁。

**Non-Goals:**

- 不改变 Growth 领域任务批次、锁、重试、尝试记录和 FruitService 落地规则。
- 不新增 HTTP API。
- 不新增数据库表。
- 不实现通用插件市场或任意脚本执行环境。
- 不让生成器 Skill 直接输出果实 meta 或调用内容森林业务能力。
- 不要求第一期支持多语言脚本、长期运行脚本、网络访问脚本或复杂沙箱。

## Decisions

### Decision 1: 枝化生长 Skill 作为内置系统 Skill 注册

枝化生长 Skill 是内容森林 Agent 的系统能力，负责把生成器 payload 转换为候选果实结构体。它必须理解内容森林的边界和输出契约，因此应随后端代码发布，并在应用装配时注册到 SkillRegistry。

备选方案是把枝化生长 Skill 做成文件夹型外部 Skill。该方案看起来更灵活，但会让系统核心流程变成用户可替换资源，容易破坏 Growth 领域与 Fruit 领域的系统事实边界。第一期不采用。

### Decision 2: 生成器 Skill 作为外部文件夹资源动态读取

生成器 Skill 仍然由生成器模块管理，作为独立创作方法论存在。枝化生长 Skill 根据 Growth 任务传入的生成器引用，通过 Tool 读取生成器 Skill 文件夹，而不是在启动时全量加载所有生成器。

该设计保留生成器独立性：生成器可以只有 `SKILL.md`，也可以包含附件、参考资料和 JS 脚本。生成器不需要知道内容森林的果实结构。

### Decision 3: 生成器 JS 脚本必须通过受控 Tool 执行

如果生成器 Skill 需要使用其文件夹内的 JS 脚本，枝化生长 Skill 只能调用受控脚本执行 Tool。该 Tool 负责限制执行范围、入口文件、工作目录、超时、输出大小和错误包装。

受控执行的最小边界：

- 只能执行当前生成器 Skill 文件夹内允许的 JS 文件。
- 不能接收真实绝对路径作为模型可自由拼接的参数。
- 默认不开放网络访问和任意系统命令。
- 执行输入来自枝化生长 Skill 整理后的上下文，不包含 API Key 等密钥。
- 输出必须被视为生成器 payload，而不是果实或系统事实。

### Decision 4: 枝化生长 Skill 成功输出只能是候选果实结构体

每次 Agent `growth` 调用只生成一个候选果实。成功输出必须是结构化候选果实对象，表达：

- 用户可见、可发布的果实 Markdown 正文。
- 生成器原始 payload 或其引用摘要。
- 候选果实摘要。
- 基因标签。
- 本次使用过的授权资源引用。
- 生成过程警告或可展示说明。

该结构体仍不是果实。Growth 领域拿到后继续做可落地校验，并调用 FruitService 创建候选果实。

### Decision 5: 使用 Tool Calling + 本地 Schema 校验确保结构化输出

第一期不依赖 MiniMax 是否完整支持 `response_format: json_schema`。优先使用“提交候选果实”的 Tool Calling 风格约束，让模型最终调用一个结构化提交工具；Tool 参数再由本地 Schema 校验。

校验失败时，枝化生长 Skill 进入修复流程：把校验错误和原始输出反馈给模型，要求只修复结构，不重新创作内容。最多修复有限次数；仍失败则本次 Agent 调用失败，由 Growth 领域记录该果实生成尝试失败。

### Decision 6: 输出 Schema 分层校验

校验分为三层：

- 结构层：必须是对象，必须包含候选果实类型、payload、meta 等必要部分，不允许空结构。
- 内容层：Markdown 正文非空，摘要非空，基因标签可为空但必须是数组，引用必须是授权引用标识。
- 边界层：不能包含真实本地文件路径、不能声明已保存果实、不能伪造任务状态、不能要求 Growth 跳过 FruitService。

Growth 领域仍保留最终可落地校验，因为 Agent 的结构化输出只是候选结果。

### Decision 7: Agent Trace 记录自检与修复过程

枝化生长 Skill 应把关键步骤写入 Agent Trace，包括读取来源节点、读取生成器、执行生成器脚本、提交候选果实、Schema 校验、修复重试和最终失败原因。Trace 不应包含 API Key、真实绝对路径或过长正文。

## Risks / Trade-offs

- [Risk] Tool Calling 在不同供应商兼容性上存在差异 -> 使用本地 Schema 校验作为最终可信边界，并允许后续替换为 provider-native structured output。
- [Risk] JS 脚本执行带来安全风险 -> 第一期开启严格受控执行，只允许生成器文件夹内脚本，限制超时、输出大小和可访问范围。
- [Risk] 修复重试增加 LLM 调用成本 -> 限制修复次数，且修复只处理结构，不重新生成完整内容。
- [Risk] 结构化约束可能压低创作自由度 -> 生成器 payload 仍保持自由 Markdown，结构化只作用于枝化生长 Skill 的候选果实包装。
- [Risk] Growth 与 Agent 输出校验职责重复 -> 保持双层防线：Agent 负责结构可信，Growth 负责业务可落地。

## Migration Plan

该变更新增 Agent 能力，不迁移既有数据。实现时先补齐候选果实 Schema、自检器和生成器 Skill 读取/脚本执行 Tool，再注册内置枝化生长 Skill，最后接入 Growth 领域的 AgentPort 调用测试。

如果需要回滚，移除新注册的内置 Skill 和新增 Tool 即可；Growth 领域仍可使用测试替身 AgentPort，不影响已存在的种子、生成器、果实和生长任务数据。

## Open Questions

- 第一期生成器 JS 脚本是否允许导入同文件夹内的辅助模块，还是只允许单文件入口。
- 生成器脚本输出是否只接受 stdout JSON/Markdown，还是允许返回附件引用清单。
- 候选果实结构中的附件引用是否在本变更内定义，还是等媒体/附件能力成熟后扩展。
