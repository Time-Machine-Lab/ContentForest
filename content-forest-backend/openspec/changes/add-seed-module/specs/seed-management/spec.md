## ADDED Requirements

### Requirement: 创建种子
系统 SHALL 支持用户创建一个未归档种子，且创建时必须提供种子标题和 Markdown 正文。种子创建成功后 MUST 成为一棵内容树的根节点，并关联一个可读取的 Markdown 内容本体位置。

#### Scenario: 成功创建种子
- **WHEN** 用户提交非空标题和非空 Markdown 正文创建种子
- **THEN** 系统创建一个未归档种子
- **AND** 系统保存种子 Markdown 内容本体
- **AND** 系统建立种子作为内容树根节点的系统事实

#### Scenario: 正文为空时拒绝创建
- **WHEN** 用户提交标题但 Markdown 正文为空
- **THEN** 系统 MUST 拒绝创建种子
- **AND** 系统 MUST 不创建草稿态种子

#### Scenario: 标题为空时拒绝创建
- **WHEN** 用户提交 Markdown 正文但标题为空
- **THEN** 系统 MUST 拒绝创建种子
- **AND** 系统 MUST 不创建草稿态种子

### Requirement: 查看种子列表
系统 SHALL 支持按归档状态查看种子列表。未归档种子 MUST 展示在主种子库列表中，已归档种子 MUST 展示在已归档列表中。

#### Scenario: 查看主种子库列表
- **WHEN** 用户打开主种子库列表
- **THEN** 系统 MUST 只返回未归档种子
- **AND** 系统 MUST 不返回已归档种子

#### Scenario: 查看已归档种子列表
- **WHEN** 用户打开已归档种子列表
- **THEN** 系统 MUST 只返回已归档种子

### Requirement: 查看种子详情
系统 SHALL 支持查看种子详情，并通过内容本体位置读取种子 Markdown 正文。Markdown 正文 MUST 不作为系统 meta 的来源。

#### Scenario: 查看未归档种子详情
- **WHEN** 用户查看一个未归档种子详情
- **THEN** 系统 MUST 返回该种子的系统事实
- **AND** 系统 MUST 返回该种子的 Markdown 正文

#### Scenario: 查看已归档种子详情
- **WHEN** 用户查看一个已归档种子详情
- **THEN** 系统 MUST 返回该种子的系统事实
- **AND** 系统 MUST 返回该种子的 Markdown 正文

### Requirement: 编辑种子
系统 SHALL 支持编辑种子标题和 Markdown 正文。编辑种子 MUST 不改变种子身份、根节点关系或已生成果实的历史关系。

#### Scenario: 编辑未归档种子
- **WHEN** 用户编辑未归档种子的标题或 Markdown 正文
- **THEN** 系统 MUST 保存编辑后的内容
- **AND** 系统 MUST 保持该种子的根节点关系不变

#### Scenario: 编辑已归档种子
- **WHEN** 用户编辑已归档种子的标题或 Markdown 正文
- **THEN** 系统 MUST 保存编辑后的内容
- **AND** 系统 MUST 保持该种子的归档状态不变

#### Scenario: 编辑为空内容时拒绝保存
- **WHEN** 用户将种子标题或 Markdown 正文编辑为空并提交
- **THEN** 系统 MUST 拒绝保存

### Requirement: 归档与回档种子
系统 SHALL 支持归档和回档种子。归档不是删除；种子归档后 MUST 保留详情、内容树和历史关系。

#### Scenario: 归档种子
- **WHEN** 用户归档一个未归档种子
- **THEN** 系统 MUST 将该种子标记为已归档
- **AND** 系统 MUST 从主种子库列表隐藏该种子
- **AND** 系统 MUST 在已归档种子列表中展示该种子

#### Scenario: 回档种子
- **WHEN** 用户回档一个已归档种子
- **THEN** 系统 MUST 将该种子恢复为未归档
- **AND** 系统 MUST 在主种子库列表中展示该种子

### Requirement: 已归档工作区只读
系统 SHALL 将已归档种子的工作区视为只读工作区。已归档种子及其内容树中的节点 MUST 不允许作为新的枝化生长来源。

#### Scenario: 已归档种子不能发起生长
- **WHEN** 用户尝试从已归档种子发起枝化生长
- **THEN** 系统 MUST 拒绝该操作

#### Scenario: 已归档种子的果实不能发起生长
- **WHEN** 用户尝试从已归档种子内容树中的果实发起枝化生长
- **THEN** 系统 MUST 拒绝该操作

#### Scenario: 回档后恢复生长能力
- **WHEN** 用户回档一个已归档种子
- **THEN** 该种子及其内容树节点 MAY 重新作为枝化生长来源
- **AND** 是否可立即生长仍 MUST 由枝化生长领域的生长锁规则判断

### Requirement: 禁止删除和草稿态
系统 SHALL 不提供删除种子能力，也 SHALL 不存在草稿态种子。

#### Scenario: 不支持删除种子
- **WHEN** 用户需要从主种子库移除一个种子
- **THEN** 系统 MUST 仅提供归档能力
- **AND** 系统 MUST 保留该种子的内容和历史关系

#### Scenario: 不存在草稿态种子
- **WHEN** 种子创建请求不满足完整性要求
- **THEN** 系统 MUST 拒绝创建
- **AND** 系统 MUST 不保存为草稿种子
