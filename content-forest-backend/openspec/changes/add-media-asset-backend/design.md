## Context

内容森林已经采用“内容本体文件化，系统事实数据库化”的架构。多媒体资源应延续这个边界：图片、视频等二进制内容是内容本体，数据库只维护资源身份、类型、来源、内容位置、挂载关系和审计信息。

生成器是否能生成图片或视频不由内容森林限制；本 change 只提供统一接管、保存、读取、挂载和引用媒体资源的后端能力。Agent 调用 Skill 工具并把产物转为媒体资源的能力由 `connect-skill-media-tools` 单独处理。

当前枝化生长已经引入内容探索路线、Reference Planner、ReferenceAtom、planned/actual reference usage、临时营养卡片和生成路径图。媒体作为输入时必须进入这套引用规划体系，不能沿用旧的“直接塞给 AgentPort”的旁路设计。

## Goals / Non-Goals

**Goals:**

- 建立跨平台、可替换存储的 Media Asset 抽象。
- 支持用户上传图片和视频，后端保存为媒体资源。
- 支持果实挂载多个媒体资源。
- 支持枝化生长提交媒体引用和用途说明，并将媒体引用纳入授权范围与引用规划。
- 支持前端通过后端接口读取或预览媒体内容。

**Non-Goals:**

- 不实现图片生成、视频生成、视频理解或抽帧。
- 不要求生成器声明媒体能力。
- 不把媒体二进制或绝对路径写入 Markdown。
- 不做专业素材管理器、图片编辑器或视频剪辑时间线。
- 不改变果实 Markdown 作为正文主体的定位。

## Decisions

### Decision 1: Media Asset 是独立系统资源

媒体资源以独立实体存在，果实、枝化生长输入或未来营养库都可以引用它。果实与媒体之间通过挂载关系表达。

理由：同一媒体可能被多个果实或生长任务复用，直接内嵌到果实正文会导致复用和追溯困难。

### Decision 2: 内容访问层屏蔽存储实现

数据库保存相对 `contentLocation` 或存储适配器无关的位置，不保存 Windows、Linux 或 macOS 绝对路径。前端通过后端媒体接口读取，未来可以替换为 OSS 签名 URL 或代理流。

理由：满足跨操作系统和后续对象存储迁移要求。

### Decision 3: 媒体用途由枝化输入提供

`mediaRefs` 不只是资源 ID，还需要用途说明，例如理解内容、参考风格、参考结构、生成文案、平台样例。

理由：同一张图可能用于“理解内容”或“模仿风格”，Agent 需要明确使用意图。

### Decision 3.1: 媒体输入进入 Reference Planner

用户上传并引用的媒体资源是本轮枝化生长的授权参考资源。系统必须将其作为媒体类 reference source / resource type 纳入 ReferenceAtom、ReferencePlan 和 planned/actual usage，而不是仅作为 AgentPort 的额外字段。

理由：现在枝化生成已经通过引用规划控制上下文注意力。媒体也需要表达“用于约束、提供证据、参考风格、参考结构或生成素材”等使用角色，才能与营养、基因、临时营养卡片共用同一套上下文调度机制。

### Decision 4: 果实详情区分正文与媒体资源区

果实 Markdown 继续表达正文主体，媒体挂载作为结构化资产区返回给前端展示。

理由：避免 Markdown 承载系统挂载关系，同时让前端能稳定展示图片画廊、视频播放器和附件列表。

### Decision 5: 第一版允许上传视频但不承诺理解视频

视频可以上传、存储、引用和展示。Agent 是否能理解视频取决于后续工具能力。

理由：视频理解依赖抽帧、转写或多模态模型，不能与媒体资源底座混在同一原子提案里。

### Decision 6: 媒体输入与媒体输出分流

本 change 只定义媒体资源底座和“已存在媒体作为输入引用”的能力。Skill 工具生成的新媒体属于输出产物，必须先由 `connect-skill-media-tools` 作为候选媒体产物接管，再转成正式 Media Asset。

理由：媒体输入用于引用规划，媒体输出用于果实挂载；两者生命周期不同，混在一起会污染 actual reference usage。

## Risks / Trade-offs

- [Risk] 大视频文件导致本地存储和上传压力 → Mitigation: 第一版设置文件大小和 MIME 白名单，后续再接分片或 OSS。
- [Risk] 前端误以为上传视频即代表 Agent 能理解视频 → Mitigation: API 和 UI 区分“可引用资源”和“当前 Agent 可处理能力”。
- [Risk] 媒体路径泄露本机信息 → Mitigation: 所有外部接口只暴露 mediaAssetId 和受控访问 URL/接口。
- [Risk] 果实媒体展示与 Markdown 图片重复 → Mitigation: 第一版以系统挂载为准，Markdown 内图片只作为普通正文内容处理。

## Migration Plan

1. 先更新 `docs/api/media.yaml`、`docs/sql/media.sql` 和相关顶层文档。
2. 实现媒体上传、存储、读取和删除边界；第一版不提供硬删除业务入口。
3. 增加果实媒体挂载关系和果实详情返回。
4. 增加枝化生长 `mediaRefs` 参数校验、授权范围、ReferenceAtom、ReferencePlan 和 planned/actual usage 对接。
5. 增加工作区媒体摘要聚合。

回滚时可停止暴露媒体接口，已有果实 Markdown 和系统事实不受影响。
