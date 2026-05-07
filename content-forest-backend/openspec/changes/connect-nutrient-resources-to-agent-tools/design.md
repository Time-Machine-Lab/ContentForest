## Context

内容森林第一期的枝化生长需要把用户选择的生成器、来源节点、营养内容和基因经验交给 Agent。营养库后端已经实现公共营养库、种子专属营养库、营养内容 Markdown、归档过滤和按种子查询可引用内容的能力。

当前需要补齐的是 Agent Tool 层的连接：枝化生长 Agent 不能直接读取营养库全量内容，也不能绕过领域授权读取本地文件。它只能读取本次生长任务授权范围内的资源。该设计遵守 `docs/design/内容森林架构设计文档.md` 中“内容本体文件化、系统事实数据库化”的原则，也遵守 `docs/design/内容森林Agent架构设计文档.md` 中“Agent 通过只读 Tool 读取授权上下文”的边界。

## Goals / Non-Goals

**Goals:**

- 让枝化生长 Agent 通过只读资源 Tool 读取已授权营养内容 Markdown。
- 复用营养库领域提供的按种子可引用查询能力，确保公共营养与当前种子专属营养可以被引用。
- 在生长任务创建阶段校验营养引用，防止归档内容、归档库、其他种子专属内容或不存在内容进入 Agent 授权范围。
- 将营养资源和基因经验统一作为枝化生长参考资源返回给内置枝化生长 Skill。
- 保持 Agent Tool 只读，不写数据库、不写 Markdown、不修改任务、果实、营养或基因状态。

**Non-Goals:**

- 不新增营养库 HTTP API。
- 不新增或修改 SQL 契约。
- 不实现向量检索、全文搜索、自动选择营养内容或营养内容排序。
- 不让 Agent 自主浏览全量营养库。
- 不把营养库接入基因汲取 Skill；基因汲取仍以行为证据和既有基因经验为主。

## Decisions

### Decision 1: 复用 `read_growth_resources` 作为统一资源读取入口

枝化生长已经存在“读取参考资源”的语义，营养内容和基因经验都属于本次生长的授权参考资源。因此营养内容应接入 `read_growth_resources`，而不是新增一个可按任意 ID 读取营养内容的独立 Tool。

替代方案是新增 `read_nutrient_content` Tool。该方案会让 Agent 多一个更接近任意资源读取的入口，容易削弱任务授权边界，也会让枝化生长 Skill 同时理解多个资源读取接口，第一期没有必要。

### Decision 2: 授权在 GrowthService 创建任务阶段完成

前端或调用方提交 `nutrientRefs` 后，GrowthService 需要通过营养库领域能力校验这些引用是否可被当前种子引用。只有通过校验的引用才能进入 `authorizationScope` 并被 Agent Tool 读取。

替代方案是在 Tool 内部才做全部授权判断。该方案仍然需要保留 Tool 防线，但会让无效引用进入生长任务记录和 Agent 输入，失败时间更晚，用户体验和问题定位都较差。

### Decision 3: Tool 读取时二次限制在授权引用集合内

即使 GrowthService 已经完成引用校验，Tool 仍然只读取 `authorizationScope.nutrientRefs` 中列出的营养内容，并通过营养库的可引用查询结果二次过滤。这样可以防止 Agent 在 Tool 输入中伪造其他资源 ID。

替代方案是 Tool 信任 Agent 传参。该方案违反 Agent 任务授权优先原则，不采用。

### Decision 4: 返回内容只包含业务可用上下文，不暴露真实路径

Tool 返回营养内容时，只返回资源类型、资源 ID、标题、所属营养库摘要和 Markdown 正文。内容位置、数据库状态和本地绝对路径不作为 Agent 必要上下文暴露。

替代方案是返回完整数据库记录。该方案会把系统事实细节暴露给 Agent，增加 prompt 噪音，也可能泄露不必要的实现信息。

### Decision 5: 基因汲取暂不读取营养库

营养库是创作参考，基因汲取是从选择、淘汰、发布和反馈中沉淀经验。第一期不把营养内容接入基因汲取 Tool，避免把“参考资料”误当成“验证证据”。

## Risks / Trade-offs

- [Risk] 用户选择大量营养内容会导致 Agent 上下文膨胀 → Mitigation：第一期只读取显式授权引用，后续再增加数量限制、摘要或检索能力。
- [Risk] Tool 静默跳过不可引用资源会掩盖授权错误 → Mitigation：任务创建阶段必须先校验引用；Tool 层测试覆盖归档和越权资源不可读取。
- [Risk] 营养内容可能包含 prompt injection 文本 → Mitigation：枝化生长 Skill prompt 需把营养内容视为参考资料而非系统指令，Agent 输出仍需结构化校验。
- [Risk] 当前读取方式不支持按语义自动挑选营养 → Mitigation：第一期保持轻量，后续在营养库领域或资源读取 Tool 上扩展检索与摘要。

## Migration Plan

该变更不迁移数据，不修改 API 或 SQL。上线时只需要在应用装配中为枝化生长资源 Tool 注入 NutrientStoragePort 与 NutrientMarkdownContentAccessPort，并补齐授权与测试。

回滚时移除营养库依赖注入与营养读取逻辑即可；既有营养库数据、API、SQL 和枝化生长任务结构不需要迁移。

## Open Questions

暂无阻塞问题。后续可以单独讨论是否为营养资源读取增加数量上限、摘要策略或搜索能力。
