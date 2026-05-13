## ADDED Requirements

### Requirement: 统一营养工作台用户侧概念
前端 SHALL 在营养工作台中将用户侧资料统一显示为“营养内容”。前端内部可以继续使用后端返回的 `nutrient-cards` 契约字段，但 UI 文案 MUST NOT 把“营养卡片”表达为独立于营养内容之外的新对象。

#### Scenario: 展示营养内容列表
- **WHEN** 用户打开种子营养工作台
- **THEN** 前端 MUST 展示营养内容列表
- **AND** 列表项 MUST 使用“营养内容”相关文案
- **AND** 前端 MUST NOT 使用“营养卡片”作为用户侧对象名称

#### Scenario: 采纳建议生成草稿
- **WHEN** 用户采纳营养汲取建议
- **THEN** 前端 MUST 表达为保存草稿营养内容
- **AND** 前端 MUST NOT 表达为创建营养卡片

### Requirement: 营养内容生命周期状态展示
前端 SHALL 将后端状态值映射为草稿、已沉淀和已归档。不同状态 MUST 展示不同操作边界。

#### Scenario: 展示草稿状态
- **WHEN** 后端返回状态值为 `unsettled` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“草稿”
- **AND** 前端 MUST 提供编辑、沉淀和删除操作
- **AND** 前端 MUST 允许草稿作为本次枝化生长的临时引用

#### Scenario: 展示已沉淀状态
- **WHEN** 后端返回状态值为 `settled` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“已沉淀”
- **AND** 前端 MUST 提供编辑、归档和默认带入操作
- **AND** 前端 MUST NOT 提供删除操作

#### Scenario: 展示已归档状态
- **WHEN** 后端返回状态值为 `archived` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“已归档”
- **AND** 前端 MUST 表达该内容不可被新的枝化生长引用
- **AND** 前端 MUST NOT 提供删除或默认带入操作

### Requirement: 自动准备默认种子专属营养库
前端 SHALL 在打开种子营养工作台时调用 `docs/api/nutrient.yaml` 中由后端定义的默认专属营养库确保接口。前端 MUST NOT 自行拼接默认库名称或绕过后端契约创建营养库。

#### Scenario: 打开营养工作台
- **WHEN** 用户从种子工作区打开营养工作台
- **THEN** 前端 MUST 请求后端确保当前种子的默认专属营养库
- **AND** 成功后前端 MUST 使用返回的库作为草稿沉淀的默认目标
- **AND** 前端 MUST 同步加载当前种子的营养内容列表

#### Scenario: 默认库准备失败
- **WHEN** 默认专属营养库确保请求失败
- **THEN** 前端 MUST 展示局部失败反馈和重试入口
- **AND** 前端 MUST 保留工作台已输入内容
- **AND** 前端 MUST NOT 在本地伪造默认库

### Requirement: 删除草稿营养内容
前端 SHALL 只对草稿态营养内容展示删除操作，并 MUST 调用 `docs/api/nutrient.yaml` 中由后端定义的草稿删除接口。

#### Scenario: 删除草稿
- **WHEN** 用户点击草稿营养内容的删除操作并确认
- **THEN** 前端 MUST 调用草稿删除接口
- **AND** 删除成功后前端 MUST 从列表中移除该草稿
- **AND** 前端 MUST 清空该草稿的详情选中态

#### Scenario: 非草稿不显示删除
- **WHEN** 用户查看已沉淀或已归档营养内容
- **THEN** 前端 MUST NOT 展示删除操作
- **AND** 已沉淀内容 MUST 通过归档退出可引用范围

### Requirement: 默认带入交互
前端 SHALL 将 `defaultForGrowth` 用户侧展示为“默认带入”。已沉淀且默认带入的营养内容 MUST 在枝化生长前默认出现在引用区，但用户 MUST 能在本次生成前移除。

#### Scenario: 设置默认带入
- **WHEN** 用户在已沉淀营养内容上启用默认带入
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的默认带入设置接口
- **AND** 成功后前端 MUST 将该内容标记为默认带入

#### Scenario: 枝化生长默认引用
- **WHEN** 用户打开枝化生长输入框
- **THEN** 前端 MUST 将默认带入的已沉淀营养内容加入默认引用区
- **AND** 用户 MUST 能移除任意默认带入项
- **AND** 前端 MUST 只提交用户本次确认保留的引用
