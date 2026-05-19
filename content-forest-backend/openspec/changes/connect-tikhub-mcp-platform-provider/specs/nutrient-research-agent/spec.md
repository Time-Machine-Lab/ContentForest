## ADDED Requirements

### Requirement: 营养研究 Skill 必须区分 TikHub 实采和 Codex 深研
系统 SHALL 要求营养研究 Skill 根据来源类型生成普通回复和可沉淀营养块。Skill MUST 区分 TikHub MCP 实采平台证据、Codex 候选线索、Codex 综合分析和受限状态，MUST NOT 将 Codex 推断表述为 Twitter/X 原始帖子数据。

#### Scenario: 使用 TikHub Twitter 实采证据生成营养
- **WHEN** 联网研究结果包含 TikHub Twitter/X `complete_observed_case`
- **THEN** Skill MAY 基于这些实采帖子总结产品定位、卖点表达、互动信号和传播角度
- **AND** Skill MUST 在可沉淀营养块中保留来源摘要或来源引用

#### Scenario: 使用 Codex 深研补充
- **WHEN** 联网研究结果包含 Codex 深研补充
- **THEN** Skill MUST 将其作为背景、候选线索或综合分析使用
- **AND** Skill MUST NOT 把 Codex 内容写成 TikHub 实采帖子事实

### Requirement: 营养研究输出必须表达 TikHub 采集限制
系统 SHALL 要求营养研究输出包含必要的 TikHub 采集限制说明。当 TikHub Provider 返回 key 缺失、额度不足、平台不支持、工具不可用、session 失效或空结果时，Skill MUST 向用户说明限制，并基于可用证据谨慎生成建议。

#### Scenario: TikHub 采集受限
- **WHEN** 联网研究包包含 TikHub 受限状态
- **THEN** Skill MUST 在回复中说明受限原因
- **AND** Skill MUST NOT 基于受限状态编造帖子、作者或互动数据

### Requirement: 多平台营养块必须沉淀可迁移打法
系统 SHALL 要求可沉淀营养块从多平台证据中提炼可复用创作营养。营养块 MUST 优先沉淀平台语气、卖点表达、内容结构、评论语言、互动信号、跨平台差异和可迁移打法，MUST NOT 只是无加工地罗列帖子。

#### Scenario: 从 Twitter AI 产品帖子提炼营养
- **WHEN** TikHub MCP 返回 5 条 Twitter/X AI 产品相关完整帖子证据
- **THEN** Skill MUST 总结这些帖子对当前种子或 AI 产品传播的可迁移启发
- **AND** Skill MUST 保留足够的证据引用，便于用户回看来源
