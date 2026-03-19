## Purpose

提供生成器市场相关的后端 API，包括列表查询、详情获取、安装、发布和评分。

## Requirements

### Requirement: 生成器市场列表接口

提供公开的生成器市场列表，支持分页与搜索过滤。

#### Scenario: 获取生成器列表
- **WHEN** 客户端发送 `GET /api/generators/market` 请求（可携带 `page`、`pageSize`、`keyword` 等查询参数）
- **THEN** 服务端返回符合条件的生成器列表，包含 `id`、`name`、`description`、`author`、`tags`、`installCount`、`rating`
- **AND** 响应中包含分页元信息：`total`、`page`、`pageSize`

#### Scenario: 按标签筛选生成器
- **WHEN** 客户端在查询参数中传入 `tags`（逗号分隔）
- **THEN** 服务端仅返回包含所有指定标签的生成器

### Requirement: 生成器市场详情接口

提供单个生成器的完整公开信息。

#### Scenario: 获取生成器详情
- **WHEN** 客户端发送 `GET /api/generators/market/:id`
- **THEN** 服务端返回该生成器的完整信息，包含 `id`、`name`、`description`、`author`、`tags`、`installCount`、`rating`、`schema`、`previewImages`
- **AND** 若该 `id` 不存在，则返回 `404` 状态码

### Requirement: 生成器安装接口

已登录用户可将市场中的生成器安装到自己的账号下。

#### Scenario: 成功安装生成器
- **WHEN** 已登录用户发送 `POST /api/generators/market/:id/install`
- **THEN** 在该用户的生成器列表中创建一条安装记录
- **AND** 该生成器的 `installCount` 计数加一
- **AND** 接口返回 `201` 状态码及新创建的安装记录

#### Scenario: 重复安装同一生成器
- **WHEN** 用户尝试安装一个自己已安装的生成器
- **THEN** 接口返回 `409` 状态码，提示"已安装"

#### Scenario: 未登录用户尝试安装
- **WHEN** 未认证用户发送安装请求
- **THEN** 接口返回 `401` 状态码

### Requirement: 生成器发布接口

已登录用户可将自己创建的生成器发布到公开市场。

#### Scenario: 成功发布生成器
- **WHEN** 已登录用户发送 `POST /api/generators/:id/publish`
- **AND** 该生成器属于当前用户
- **THEN** 该生成器的 `visibility` 字段更新为 `public`
- **AND** 该生成器出现在市场列表中
- **AND** 接口返回 `200` 状态码及更新后的生成器信息

#### Scenario: 发布他人的生成器
- **WHEN** 用户尝试发布一个不属于自己的生成器
- **THEN** 接口返回 `403` 状态码

### Requirement: 生成器评分接口

已登录用户可对已安装的生成器进行评分。

#### Scenario: 提交评分
- **WHEN** 已登录用户发送 `POST /api/generators/market/:id/rate`，请求体包含 `score`（1–5 整数）
- **AND** 该用户已安装此生成器
- **THEN** 保存或更新该用户对此生成器的评分
- **AND** 重新计算该生成器的平均评分并更新到 `rating` 字段
- **AND** 接口返回 `200` 状态码及更新后的评分信息

#### Scenario: 对未安装的生成器评分
- **WHEN** 用户尝试对一个自己未安装的生成器评分
- **THEN** 接口返回 `403` 状态码
