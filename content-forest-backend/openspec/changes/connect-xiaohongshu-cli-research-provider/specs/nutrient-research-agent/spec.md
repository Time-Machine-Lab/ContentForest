## ADDED Requirements

### Requirement: 营养研究 Skill 必须基于证据层级生成营养
系统 SHALL 要求营养研究 Skill 根据联网研究结果的证据层级生成普通回复和可沉淀营养块。Skill MUST 区分小红书实采结果、候选线索、Codex 深研补充和受限状态，MUST NOT 将候选线索或受限状态表述为已验证小红书帖子。

#### Scenario: 使用小红书完整已观察案例生成营养
- **WHEN** 联网研究结果包含小红书 `complete_observed_case`
- **THEN** Skill MAY 基于这些实采案例总结标题、封面、正文结构、用户痛点和互动信号
- **AND** Skill MUST 在可沉淀营养块中保留来源摘要或来源引用

#### Scenario: 只有候选线索
- **WHEN** 联网研究结果只有 `candidate_lead`
- **THEN** Skill MUST 明确说明这些内容尚未完成平台详情验证
- **AND** Skill MUST NOT 把候选线索写成确定的小红书爆款案例

### Requirement: 营养研究输出必须表达采集限制
系统 SHALL 要求营养研究输出包含必要的采集限制说明。当小红书 Provider 返回登录、验证码、IP 限制、空结果或 CLI 不可用时，Skill MUST 向用户说明限制，并基于可用证据谨慎生成建议。

#### Scenario: 小红书采集受限
- **WHEN** 联网研究包包含小红书受限状态
- **THEN** Skill MUST 在回复中说明受限原因
- **AND** Skill MUST NOT 基于受限状态编造帖子、作者或互动数据

### Requirement: 可沉淀营养块必须服务创作而不是堆砌原帖
系统 SHALL 要求可沉淀营养块从平台证据中提炼可复用创作营养。营养块 MUST 优先沉淀标题钩子、封面策略、正文结构、用户痛点、评论语言、互动信号和可迁移打法，MUST NOT 只是无加工地罗列原帖。

#### Scenario: 从小红书帖子提炼营养
- **WHEN** 小红书 Provider 返回 5 条 AI 产品相关完整帖子证据
- **THEN** Skill MUST 总结这些帖子对当前种子或 AI 产品传播的可迁移启发
- **AND** Skill MUST 保留足够的证据引用，便于用户回看来源
