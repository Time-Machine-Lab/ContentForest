## ADDED Requirements

### Requirement: 初始化媒体资源内容目录
系统 SHALL 在运行时文件系统中初始化媒体资源内容目录。该目录 MUST 位于内容本体根目录下，并 MUST 通过内容访问层访问。

#### Scenario: 启动时创建媒体目录
- **WHEN** 后端应用启动并初始化内容根目录
- **THEN** 系统 MUST 确保媒体资源目录存在
- **AND** 重复启动 MUST 不清空已有媒体文件

#### Scenario: 媒体位置使用相对路径
- **WHEN** 系统保存媒体资源内容位置
- **THEN** 系统 MUST 保存相对内容位置或存储适配器无关位置
- **AND** 系统 MUST 不保存开发者本机绝对路径
