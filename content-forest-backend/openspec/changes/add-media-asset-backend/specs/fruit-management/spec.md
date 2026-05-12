## ADDED Requirements

### Requirement: 果实挂载媒体资源
系统 SHALL 支持果实挂载一个或多个媒体资源。媒体挂载关系 MUST 由数据库维护，MUST 不写入果实 Markdown 正文。

#### Scenario: 创建果实时挂载媒体
- **WHEN** 枝化生长交付的果实候选包含已接管的媒体资源
- **THEN** 果实领域 MUST 在创建果实时建立媒体挂载关系
- **AND** 果实 Markdown 正文 MUST 不保存该挂载 meta

#### Scenario: 查看果实详情返回媒体
- **WHEN** 用户查看果实详情
- **THEN** 系统 MUST 返回果实 Markdown 正文
- **AND** 系统 MUST 返回该果实挂载的媒体资源列表

#### Scenario: 历史果实无媒体
- **WHEN** 用户查看没有媒体挂载的历史果实
- **THEN** 系统 MUST 正常返回果实详情
- **AND** 媒体资源列表 MUST 为空
