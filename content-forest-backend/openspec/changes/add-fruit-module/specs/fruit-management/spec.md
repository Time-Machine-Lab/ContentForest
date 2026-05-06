## ADDED Requirements

### Requirement: 内部创建果实
系统 SHALL 支持后端内部从果实候选创建果实。果实创建 MUST 保存 Markdown 正文、建立果实系统事实、关联父节点引用，并默认设置为候选状态。前端 MUST 不能直接调用果实创建能力。

#### Scenario: 成功从候选创建果实
- **WHEN** 枝化生长模块交付包含非空 Markdown 正文和父节点引用的果实候选
- **THEN** 系统 MUST 创建一个候选果实
- **AND** 系统 MUST 保存果实 Markdown 正文
- **AND** 系统 MUST 建立果实系统事实和父节点引用

#### Scenario: 缺少正文时拒绝创建
- **WHEN** 果实候选缺少 Markdown 正文或正文为空
- **THEN** 系统 MUST 拒绝创建果实
- **AND** 系统 MUST 不创建不完整果实

#### Scenario: 缺少父节点时拒绝创建
- **WHEN** 果实候选缺少父节点引用
- **THEN** 系统 MUST 拒绝创建果实
- **AND** 系统 MUST 不创建无法挂载到内容树的果实

#### Scenario: 前端不能直接创建果实
- **WHEN** 前端尝试通过公开 HTTP API 创建果实
- **THEN** 系统 MUST 不提供该公开创建能力

### Requirement: 果实内容与 meta 分离
系统 SHALL 将果实 Markdown 正文作为内容本体保存，并将果实选择状态、父节点引用、内容位置、摘要、基因标签等 meta 作为系统事实维护。Markdown 正文 MUST 不作为系统 meta 的来源。

#### Scenario: 查看果实时组合正文与系统事实
- **WHEN** 用户查看果实详情
- **THEN** 系统 MUST 返回果实系统事实
- **AND** 系统 MUST 通过内容本体位置读取并返回果实 Markdown 正文

#### Scenario: Markdown 不承载 meta
- **WHEN** 系统读取果实 Markdown 正文
- **THEN** 系统 MUST 不从 Markdown 正文解析选择状态、父节点引用、发布状态或数据反馈事实

### Requirement: 查看果实详情
系统 SHALL 支持按果实身份查看果实详情。果实详情 MUST 包含果实系统事实和 Markdown 正文。

#### Scenario: 成功查看果实详情
- **WHEN** 用户请求查看一个存在的果实
- **THEN** 系统 MUST 返回该果实详情
- **AND** 系统 MUST 返回该果实 Markdown 正文

#### Scenario: 果实不存在
- **WHEN** 用户请求查看一个不存在的果实
- **THEN** 系统 MUST 返回资源不存在错误

### Requirement: 编辑果实正文
系统 SHALL 支持编辑果实 Markdown 正文。编辑正文 MUST 不改变果实身份、父节点引用、生成来源、选择状态、摘要或基因标签。

#### Scenario: 成功编辑果实正文
- **WHEN** 用户提交非空 Markdown 正文编辑果实
- **THEN** 系统 MUST 保存新的果实 Markdown 正文
- **AND** 系统 MUST 保持果实身份、父节点引用和选择状态不变

#### Scenario: 正文为空时拒绝编辑
- **WHEN** 用户提交空 Markdown 正文编辑果实
- **THEN** 系统 MUST 拒绝保存
- **AND** 系统 MUST 保留原果实正文

#### Scenario: 已淘汰果实仍可编辑
- **WHEN** 用户编辑已淘汰果实的 Markdown 正文
- **THEN** 系统 MUST 允许编辑
- **AND** 系统 MUST 保持该果实为已淘汰状态

### Requirement: 管理物竞天择状态
系统 SHALL 支持果实在候选、已选择、已淘汰三类互斥状态之间切换。系统 MUST 不提供已保留状态，候选状态即表示暂时保留观察。

#### Scenario: 选择候选果实
- **WHEN** 用户选择一个候选果实
- **THEN** 系统 MUST 将该果实状态切换为已选择

#### Scenario: 淘汰候选果实
- **WHEN** 用户淘汰一个候选果实
- **THEN** 系统 MUST 将该果实状态切换为已淘汰
- **AND** 系统 MUST 保留该果实内容和历史关系

#### Scenario: 恢复为候选
- **WHEN** 用户将已选择或已淘汰果实恢复为候选
- **THEN** 系统 MUST 将该果实状态切换为候选

#### Scenario: 已淘汰果实可重新选择
- **WHEN** 用户选择一个已淘汰果实
- **THEN** 系统 MUST 将该果实状态切换为已选择

### Requirement: 禁止删除果实
系统 SHALL 不提供删除果实能力。用户不感兴趣的果实 MUST 通过淘汰状态表达，而不是从系统中删除。

#### Scenario: 淘汰代替删除
- **WHEN** 用户不再关注一个果实
- **THEN** 系统 MUST 提供淘汰能力
- **AND** 系统 MUST 保留果实详情、正文和父节点关系

### Requirement: 按父节点查询子果实
系统 SHALL 提供按父节点引用查询子果实的内部能力，供内容树工作区模块组装树视图。系统 MUST 不提供面向用户的全局果实列表功能。

#### Scenario: 查询某个父节点下的子果实
- **WHEN** 内容树工作区模块请求某个父节点的子果实
- **THEN** 系统 MUST 返回直接挂载在该父节点下的果实摘要集合

#### Scenario: 不提供全局果实列表
- **WHEN** 前端请求无父节点范围的全局果实列表
- **THEN** 系统 MUST 不提供该能力

### Requirement: 提供可发布判断
系统 SHALL 提供判断果实是否可发布的内部能力。只有已选择果实 MUST 被判断为可发布；候选果实和已淘汰果实 MUST 不可发布。

#### Scenario: 已选择果实可发布
- **WHEN** 发布验证模块检查一个已选择果实是否可发布
- **THEN** 系统 MUST 返回可发布结果

#### Scenario: 候选果实不可发布
- **WHEN** 发布验证模块检查一个候选果实是否可发布
- **THEN** 系统 MUST 返回不可发布结果

#### Scenario: 已淘汰果实不可发布
- **WHEN** 发布验证模块检查一个已淘汰果实是否可发布
- **THEN** 系统 MUST 返回不可发布结果

### Requirement: 果实作为生长源引用
系统 SHALL 提供果实作为后续枝化生长来源所需的基础引用能力。果实模块 MUST 不判断生长锁，也 MUST 不决定当前是否允许发起枝化生长。

#### Scenario: 获取果实生长源引用
- **WHEN** 枝化生长模块需要从某个果实继续生长
- **THEN** 系统 MUST 能返回该果实的基础引用和内容位置
- **AND** 是否当前可生长 MUST 由枝化生长领域结合生长锁判断
