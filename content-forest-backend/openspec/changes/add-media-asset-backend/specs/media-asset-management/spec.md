## ADDED Requirements

### Requirement: 上传媒体资源
系统 SHALL 支持用户上传图片和视频作为媒体资源。媒体二进制内容 MUST 通过内容访问层保存，数据库 MUST 只保存媒体系统事实和内容位置。

#### Scenario: 上传图片资源
- **WHEN** 用户上传受支持的图片文件
- **THEN** 系统 MUST 保存图片内容本体
- **AND** 系统 MUST 创建媒体资源系统事实
- **AND** 系统 MUST 返回媒体资源标识

#### Scenario: 上传视频资源
- **WHEN** 用户上传受支持的视频文件
- **THEN** 系统 MUST 保存视频内容本体
- **AND** 系统 MUST 创建媒体资源系统事实
- **AND** 系统 MUST 不承诺 Agent 一定能理解该视频内容

#### Scenario: 拒绝不支持的媒体类型
- **WHEN** 用户上传不在允许范围内的文件类型
- **THEN** 系统 MUST 拒绝创建媒体资源
- **AND** 系统 MUST 返回可理解错误

### Requirement: 跨存储读取媒体资源
系统 SHALL 通过后端受控接口读取媒体资源内容。外部 API MUST 不暴露本机绝对路径，MUST 允许后续从本地文件存储迁移到对象存储。

#### Scenario: 读取本地媒体资源
- **WHEN** 前端请求读取媒体资源内容
- **THEN** 系统 MUST 通过媒体资源标识定位内容位置
- **AND** 系统 MUST 返回文件流、受控访问响应或等价预览能力

#### Scenario: 不暴露真实路径
- **WHEN** 系统返回媒体资源详情
- **THEN** 响应 MUST 不包含 Windows、Linux 或 macOS 绝对路径
- **AND** 响应 MUST 使用 mediaAssetId、mediaType、mimeType 和受控访问入口表达资源

### Requirement: 提供媒体资源契约文档
系统 SHALL 为媒体资源提供顶层 API 与 SQL 契约文档。接口契约 MUST 落到 `docs/api/media.yaml`，存储结构契约 MUST 落到 `docs/sql/media.sql`。

#### Scenario: 提供媒体 API 契约
- **WHEN** 开发媒体上传、详情或内容读取接口
- **THEN** 系统 MUST 存在 `docs/api/media.yaml`
- **AND** 该契约 MUST 对应单一 Media Controller

#### Scenario: 提供媒体 SQL 契约
- **WHEN** 开发媒体资源存储适配器
- **THEN** 系统 MUST 存在 `docs/sql/media.sql`
- **AND** 该契约 MUST 描述媒体资源和挂载关系等系统事实
