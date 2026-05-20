## 1. 顶层文档与契约

- [ ] 1.1 更新 `docs/api/growth.yaml`，为 Growth Controller 的任务详情或 attempt 详情补充 reference plan summary、reference atom summary、planned usage 和 actual usage 等 additive schema。
- [ ] 1.2 更新 `docs/sql/growth.sql`，明确参考规划元数据在生长任务或生成尝试相关表中的 JSON 存储位置，并保留现有搜索模式、突变激进程度和突变计划字段。
- [ ] 1.3 更新 `docs/design/domain/枝化生长领域模块设计文档.md`，补充 Reference Planner 位于注意力编排层、输出 attempt 级参考计划、失败时降级的领域语义。
- [ ] 1.4 更新 `docs/design/内容森林Agent架构设计文档.md`，补充 AgentPort 传递参考计划、参考材料作为不可信数据、planned/actual usage trace 的边界。
- [ ] 1.5 更新 `docs/design/domain/营养库领域模块设计文档.md`，明确营养库只提供可引用资料，营养原子化和参考路由属于枝化生长使用策略。

## 2. 类型与校验模型

- [ ] 2.1 在 Growth 或 Agent 共享类型中定义 `ReferenceAtom`、`ReferencePlan`、`ReferenceRoute`、`ReferenceAction`、`ContentSlot` 和 `ReferenceUsageSummary`。
- [ ] 2.2 为参考计划和参考使用声明添加本地 schema 校验，覆盖资源授权、来源标识、风险等级、目标槽位、动作语义和禁用用途。
- [ ] 2.3 扩展 attempt/task metadata 映射，支持保存参考计划摘要、参考原子摘要、计划使用和实际使用摘要。
- [ ] 2.4 确保校验错误能返回可诊断摘要，同时不暴露真实本地路径、API Key、Cookie、MCP session id 或超长正文。

## 3. 参考规划算法

- [ ] 3.1 实现 source profile 规则，区分用户输入、生成器、来源节点、正式营养、未沉淀营养卡片、广告资料、论文资料、平台案例、评论信号、正向基因和负向基因的默认语义。
- [ ] 3.2 实现轻量 atomization，将授权资料整理为参考原子，并保留来源、证据强度、来源偏向、使用边界和禁用用途。
- [ ] 3.3 实现论文和广告主资料的 claim workflow，抽取候选主张、证据边界、允许表达和禁用表达。
- [ ] 3.4 实现约束门控，先处理用户明确要求、种子事实、生成器格式、授权边界、风险约束和负向基因，再执行注意力路由。
- [ ] 3.5 实现 slot-action 路由，将参考原子按标题钩子、开头、受众场景、正文结构、证明依据、话术风格、转化行动、风险检查和事实检查等槽位分配给 attempt。
- [ ] 3.6 让参考规划兼容当前 `mutationPlan`，并在未来存在 `ExplorationRoute` 时能消费 route 作为更精细的路由目标。
- [ ] 3.7 实现参考规划失败降级，回退到现有证据卡片和突变计划行为，并记录 fallback reason。

## 4. 枝化生长与 Agent 接入

- [ ] 4.1 在枝化生长管线中，于 AgentPort 调用前生成 attempt 级参考计划，并把计划绑定到对应生成尝试。
- [ ] 4.2 扩展 AgentPort growth 输入，传递参考计划摘要、参考原子摘要和风险检查要求，同时保持授权资源边界。
- [ ] 4.3 更新内置枝化生长 Skill 的 prompt/context 组织方式，按参考计划的槽位、动作和边界组织生成上下文，避免无差别拼接全部资料。
- [ ] 4.4 更新候选果实结构化输出 schema，允许返回实际使用资源、参考使用摘要、风险处理摘要和事实检查摘要。
- [ ] 4.5 在候选果实本地校验中验证参考使用声明，拒绝未授权资源、真实本地路径、伪造系统事实和缺失风险处理的高风险主张。
- [ ] 4.6 更新 Agent trace，记录参考规划生成、传递、使用摘要接收、校验和降级阶段。

## 5. 营养使用反馈

- [ ] 5.1 扩展营养使用记录逻辑，区分 provided、planned 和 actual 三层状态。
- [ ] 5.2 对正式营养和未沉淀营养卡片分别记录计划参考与实际使用，未沉淀卡片实际使用后仍不得自动沉淀。
- [ ] 5.3 更新营养使用摘要，展示参考方式、目标槽位、使用动作、证据强度、风险边界和实际使用状态。
- [ ] 5.4 保持营养使用反馈的非因果边界，不自动声明某个营养导致果实成功或失败。

## 6. 测试与验证

- [ ] 6.1 添加 reference atomization 单元测试，覆盖正式营养、未沉淀营养卡片、广告 brief、论文资料、平台案例、评论信号和正负向基因。
- [ ] 6.2 添加约束门控和 slot-action 路由测试，验证风险约束先于注意力路由，且不同 attempt 能形成不同参考计划。
- [ ] 6.3 添加 AgentPort 输入输出测试，验证参考计划传递、参考使用摘要返回、授权边界和 trace 脱敏。
- [ ] 6.4 添加枝化生长 Skill 结构化输出校验测试，覆盖未授权引用、真实路径泄露、高风险主张缺少处理摘要和 planned/actual 差异。
- [ ] 6.5 添加营养使用反馈测试，验证 provided、planned、actual 三层状态以及未沉淀营养不自动沉淀。
- [ ] 6.6 运行相关后端测试和 OpenSpec 状态检查，确认 `add-reference-planner` artifacts 完整且可进入 apply。
