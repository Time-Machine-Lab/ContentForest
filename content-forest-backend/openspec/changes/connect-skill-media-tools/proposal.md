## Why

生成器本质是外部 Skill，是否能生成图片或视频取决于 Skill 开发者提供的工具。内容森林不应限制生成器能力，但需要确保 Agent 调用 Skill 工具后产生的媒体产物能被系统接管、保存并挂载到果实。

## What Changes

- Agent Runtime 支持在执行生成器 Skill 时调用 Skill 提供的工具。
- Skill 工具产出的图片、视频或其他媒体产物由 Agent 收集为候选媒体产物。
- 枝化生长结果封装阶段将候选媒体产物交给 Media Asset 能力保存，再挂载到果实。
- 生成器不需要声明统一媒体能力，也不需要输出内容森林专用果实结构。
- 该提案依赖 `add-media-asset-backend` 提供媒体资源保存和果实挂载能力。

## Capabilities

### New Capabilities

- `skill-media-tool-connection`: Skill 工具媒体产物收集、接管、保存和果实挂载。

### Modified Capabilities

- `agent-core-runtime`: Agent Runtime 执行 Skill 时需要允许受控工具调用并收集媒体产物。
- `branch-growth-agent-connection`: 枝化生长 AgentPort 输出需要包含可接管媒体产物引用。
- `branch-growth-agent-skill`: 枝化生长 Skill 需要把生成器产物中的媒体资源纳入果实候选封装。

## Impact

- 顶层文档：`docs/design/内容森林Agent架构设计文档.md`、`docs/design/domain/枝化生长领域模块设计文档.md`、`docs/design/domain/生成器领域模块设计文档.md`。
- 依赖后端 change：`add-media-asset-backend`。
- 后端模块：Agent Runtime、Skill 工具执行、AgentPort、枝化生长 Skill、Media Asset 服务、Fruit 创建对接。
- 不实现具体图片/视频生成工具；只提供工具产物进入系统的通道。
