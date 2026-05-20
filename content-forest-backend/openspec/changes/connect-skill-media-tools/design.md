## Context

生成器 Skill 可以由外部开发者编写，内容森林不强制其包含 manifest 或声明媒体能力。某些 Skill 可能只输出 Markdown，某些 Skill 可能通过工具生成图片、视频、封面图或素材文件。

内容森林需要的不是限制生成器，而是让 Agent Runtime 在受控执行中收集工具产物，并在枝化生长封装阶段把这些产物交给 Media Asset 能力接管。

当前枝化生长候选结构已经包含 `payload.attachments`、`meta.usedResourceRefs` 和 `meta.referenceUsage`。本 change 必须明确：Skill 工具生成的新媒体是输出产物，不是本轮授权输入；它不能污染 `usedResourceRefs` 或 actual reference usage。

## Goals / Non-Goals

**Goals:**

- 允许 Agent 在执行生成器 Skill 时调用该 Skill 提供的工具。
- 收集工具产出的媒体文件或媒体引用。
- 将媒体产物保存为 Media Asset。
- 将成功接管的 Media Asset 挂载到果实候选。
- 保持生成器 Skill 的外部独立性。
- 兼容已有 `payload.attachments`，但不把它作为正式媒体资产事实来源。

**Non-Goals:**

- 不实现具体图片生成、视频生成或视频理解工具。
- 不要求所有生成器都支持媒体产出。
- 不要求生成器输出内容森林专用 manifest。
- 不让 Agent 直接写数据库或直接移动文件到正式内容目录。
- 不把失败的媒体产物视为整个果实生成必然失败，除非该媒体是生成结果必要部分。

## Decisions

### Decision 1: 生成器能力自由，系统接管确定

生成器 Skill 可以自由调用可用工具生成媒体。Agent Runtime 收集产物后，必须通过内容森林后端能力接管为 Media Asset。

理由：保持生成器自由，同时让系统事实、存储和访问边界稳定。

### Decision 2: 工具产物先进入临时区

Skill 工具生成的本地文件或二进制产物先作为临时产物存在，只有通过后端 Media Asset 校验和保存后，才成为正式媒体资源。

理由：避免 Agent 或工具绕过内容访问层写入系统事实。

### Decision 2.1: 候选媒体产物不是引用资源

Skill 工具生成的新媒体必须表达为 candidate media artifact。它可以包含临时产物标识、MIME、大小、来源工具、展示角色、是否必要等摘要，但不得写入 `usedResourceRefs`。只有用户上传并在本轮授权范围内引用的媒体输入，才属于 reference usage。

理由：`usedResourceRefs` 用于解释“本次参考了哪些已授权资料”。生成出来的新图片、新视频是结果资产，不是参考资料。

### Decision 2.2: `payload.attachments` 只做兼容提示

已有候选果实结构中的 `payload.attachments` 可以保留为生成器原始输出或文本附件提示，但正式媒体挂载必须来自 candidate media artifact 接管后的 Media Asset。

理由：字符串附件无法稳定表达跨平台存储、MIME、来源、必要性和安全校验，也可能泄露本机路径。

### Decision 3: 枝化生长 Skill 负责媒体封装建议

枝化生长 Skill 在结果封装阶段决定哪些媒体产物应挂载到果实，并提供用途或展示语义。

理由：生成器只产出 payload；果实候选封装仍属于枝化生长。

### Decision 4: 媒体接管失败可局部失败

如果某个非必要媒体产物接管失败，系统可以保留文本果实并记录 warning；如果媒体是该果实核心输出且无法接管，则该 attempt 可以失败。

理由：保持部分成功语义，避免一个附属资源失败导致整批生长失败。

## Risks / Trade-offs

- [Risk] 工具产物来源不可信 → Mitigation: 接管前执行 MIME、大小和文件边界校验。
- [Risk] Agent 工具绕过系统存储 → Mitigation: 正式资源只能由 Media Asset 服务创建，Agent 只能提交候选产物。
- [Risk] Skill 工具能力差异大 → Mitigation: AgentPort 使用通用媒体产物接口，不要求生成器统一 manifest。
- [Risk] 媒体失败影响果实生成 → Mitigation: 区分必要媒体和附属媒体，保留 warnings。

## Migration Plan

1. 等 `add-media-asset-backend` 落地媒体资源保存和果实挂载能力。
2. 扩展 Agent Runtime 工具执行产物收集。
3. 扩展枝化生长 AgentPort 输出，支持候选媒体产物摘要，并保留 `payload.attachments` 兼容处理。
4. 在枝化生长封装阶段接管媒体资源并挂载果实。
5. 补充日志和测试，确保媒体产物不会暴露真实本地路径，也不会被写入 `usedResourceRefs`。
