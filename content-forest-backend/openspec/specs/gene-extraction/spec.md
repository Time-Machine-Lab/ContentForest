## Purpose

定义基因汲取模块的种子级基因库、汲取提醒、汲取任务、基因建议、正式基因经验和可引用经验规则，并明确基因内容本体与系统事实的边界。

## Requirements

### Requirement: 准备种子级基因库
系统 SHALL 为每个种子准备一个种子级基因库。种子级基因库 MUST 归属于明确种子，并且 MUST 不与营养库混用。

#### Scenario: 种子创建后准备基因库
- **WHEN** 一个种子创建成功
- **THEN** 系统 MUST 保证该种子的基因库可用
- **AND** 该基因库 MUST 只归属于该种子

#### Scenario: 查询不存在种子的基因库
- **WHEN** 用户或系统请求不存在种子的基因库
- **THEN** 系统 MUST 返回资源不存在错误

### Requirement: 创建轻量汲取提醒
系统 SHALL 支持基于汲取线索创建轻量汲取提醒。第一版系统 MUST 允许果实选择和果实淘汰作为汲取线索，并 MUST 将其标记为弱证据来源。

#### Scenario: 果实被选择后创建提醒
- **WHEN** 一个果实被标记为已选择
- **THEN** 系统 MUST 能为该果实所属种子创建汲取提醒
- **AND** 提醒 MUST 关联该果实作为证据来源

#### Scenario: 果实被淘汰后创建提醒
- **WHEN** 一个果实被标记为已淘汰
- **THEN** 系统 MUST 能为该果实所属种子创建汲取提醒
- **AND** 提醒 MUST 关联该果实作为证据来源

#### Scenario: 提醒不自动触发汲取
- **WHEN** 系统创建汲取提醒
- **THEN** 系统 MUST NOT 自动调用 Agent 生成基因建议

### Requirement: 查询和处理汲取提醒
系统 SHALL 支持查询种子下的汲取提醒，并支持将提醒标记为已处理或已忽略。

#### Scenario: 查询待处理提醒
- **WHEN** 用户查询某个种子的汲取提醒
- **THEN** 系统 MUST 返回该种子下可处理的提醒

#### Scenario: 忽略提醒
- **WHEN** 用户忽略一个待处理汲取提醒
- **THEN** 系统 MUST 将该提醒标记为已忽略
- **AND** 系统 MUST NOT 为该提醒创建基因建议

#### Scenario: 提醒处理后不重复处理
- **WHEN** 一个提醒已经被处理或忽略
- **THEN** 系统 MUST NOT 将该提醒作为待处理提醒返回

### Requirement: 发起基因汲取任务
系统 SHALL 支持用户人为触发基因汲取任务。汲取任务 MUST 基于明确种子和至少一个证据来源创建，并 MUST 调用 AgentPort 的基因汲取能力生成建议。

#### Scenario: 成功发起汲取任务
- **WHEN** 用户基于待处理提醒或证据来源发起基因汲取
- **THEN** 系统 MUST 创建基因汲取任务
- **AND** 系统 MUST 调用 AgentPort 的 `gene_extraction` 任务能力

#### Scenario: 没有证据来源时拒绝汲取
- **WHEN** 用户发起基因汲取但没有提供任何证据来源
- **THEN** 系统 MUST 拒绝创建汲取任务

#### Scenario: Agent 调用失败
- **WHEN** AgentPort 执行基因汲取失败
- **THEN** 系统 MUST 将汲取任务标记为失败
- **AND** 系统 MUST 返回用户可理解的失败原因

### Requirement: 持久化基因建议
系统 SHALL 将 Agent 生成的基因建议持久化为待确认草稿。基因建议 MUST 保存在数据库中，且 MUST NOT 写入基因库 Markdown。

#### Scenario: Agent 生成建议后保存草稿
- **WHEN** Agent 成功返回基因建议
- **THEN** 系统 MUST 保存一条待确认基因建议
- **AND** 建议 MUST 关联种子、汲取任务和证据来源

#### Scenario: 刷新后仍可查看建议
- **WHEN** 用户刷新页面后查询待确认建议
- **THEN** 系统 MUST 返回此前已生成但尚未确认或放弃的基因建议

#### Scenario: 建议不写入 Markdown
- **WHEN** 系统保存待确认基因建议
- **THEN** 系统 MUST NOT 为该建议创建基因经验 Markdown 文件

### Requirement: 编辑和放弃基因建议
系统 SHALL 支持用户编辑待确认基因建议，并支持放弃待确认基因建议。已确认或已放弃的建议 MUST NOT 再被编辑。

#### Scenario: 编辑待确认建议
- **WHEN** 用户编辑一条待确认基因建议
- **THEN** 系统 MUST 保存编辑后的建议内容
- **AND** 建议 MUST 保持待确认状态

#### Scenario: 放弃待确认建议
- **WHEN** 用户放弃一条待确认基因建议
- **THEN** 系统 MUST 将该建议标记为已放弃
- **AND** 系统 MUST NOT 创建正式基因经验

#### Scenario: 禁止编辑已确认建议
- **WHEN** 用户尝试编辑已确认基因建议
- **THEN** 系统 MUST 拒绝编辑

### Requirement: 确认基因建议为基因经验
系统 SHALL 支持用户确认待确认基因建议。确认后，系统 MUST 创建正式基因经验，将正文写入种子级基因库 Markdown，并在数据库中维护归属、证据、谱系、生态位、状态和内容位置。

#### Scenario: 成功确认建议
- **WHEN** 用户确认一条待确认基因建议
- **THEN** 系统 MUST 创建正式基因经验
- **AND** 系统 MUST 将基因经验正文写入 Markdown
- **AND** 系统 MUST 将建议状态标记为已确认

#### Scenario: 确认时保留 Agent 建议谱系
- **WHEN** Agent 为基因建议提供谱系或生态位建议
- **THEN** 用户确认后系统 MUST 将最终谱系和生态位保存为基因经验系统事实

#### Scenario: 禁止重复确认建议
- **WHEN** 用户尝试再次确认已确认基因建议
- **THEN** 系统 MUST 拒绝重复确认

### Requirement: 基因经验内容与 meta 分离
系统 SHALL 将正式基因经验正文保存为 Markdown，并将归属种子、证据来源、谱系、生态位、状态和内容位置作为系统事实维护。Markdown MUST NOT 作为系统 meta 的来源。

#### Scenario: 查看基因经验详情
- **WHEN** 用户查看一条基因经验详情
- **THEN** 系统 MUST 返回该基因经验系统事实
- **AND** 系统 MUST 通过内容位置读取并返回 Markdown 正文

#### Scenario: Markdown 不承载 meta
- **WHEN** 系统读取基因经验 Markdown
- **THEN** 系统 MUST NOT 从 Markdown 解析归属种子、证据来源、谱系、生态位或状态

### Requirement: 管理正式基因经验
系统 SHALL 支持查看、编辑和归档正式基因经验。系统 MUST 不提供硬删除能力。

#### Scenario: 编辑基因经验正文
- **WHEN** 用户编辑一条正式基因经验正文
- **THEN** 系统 MUST 保存新的 Markdown 正文
- **AND** 系统 MUST 保持该基因经验的身份和证据来源不变

#### Scenario: 归档基因经验
- **WHEN** 用户归档一条基因经验
- **THEN** 系统 MUST 将该基因经验标记为已归档
- **AND** 已归档基因经验 MUST NOT 作为新的枝化生长引用上下文

#### Scenario: 禁止删除基因经验
- **WHEN** 用户不再希望使用某条基因经验
- **THEN** 系统 MUST 提供归档能力
- **AND** 系统 MUST 保留该基因经验的正文、证据和历史关系

### Requirement: 查询可引用基因经验
系统 SHALL 支持查询某个种子下可引用的基因经验。可引用基因经验 MUST 只来自该种子的种子级基因库，并且 MUST 排除已归档经验。

#### Scenario: 查询种子可引用经验
- **WHEN** 枝化生长模块或前端查询某个种子的可引用基因经验
- **THEN** 系统 MUST 返回该种子下未归档的基因经验集合

#### Scenario: 不返回其他种子的经验
- **WHEN** 查询某个种子的可引用基因经验
- **THEN** 系统 MUST NOT 返回其他种子的基因经验

### Requirement: 补齐基因汲取契约文档
系统 SHALL 新增基因汲取相关顶层契约文档。接口契约 MUST 落到 `docs/api/gene.yaml`，存储契约 MUST 落到 `docs/sql/gene.sql`。

#### Scenario: API 契约存在
- **WHEN** 开发者查看基因汲取接口契约
- **THEN** 系统 MUST 提供 `docs/api/gene.yaml`

#### Scenario: SQL 契约存在
- **WHEN** 开发者查看基因汲取存储契约
- **THEN** 系统 MUST 提供 `docs/sql/gene.sql`


