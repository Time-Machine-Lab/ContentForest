## ADDED Requirements

### Requirement: 保存草稿 (Save Draft)
系统 SHALL 允许用户通过 API 保存一个草稿种子。如果是新种子，创建状态为 `draft`；如果是已有草稿，更新其内容。必须提供 `title` 和 `content`，`tags` 可选。

#### Scenario: 创建新草稿
- **WHEN** 用户发送 `POST /api/seeds/draft`，携带 `title` 和 `content`
- **THEN** 系统生成新 ID
- **THEN** 系统在 Redis 和文件系统中保存种子，状态为 `draft`
- **THEN** 系统将标签写入 Tag Registry
- **THEN** 返回新种子的 ID 和状态

#### Scenario: 更新已有草稿
- **WHEN** 用户发送 `POST /api/seeds/draft`，携带已存在的 `id` (且状态为 `draft`)
- **THEN** 系统更新对应的 Redis 和文件数据
- **THEN** 返回 HTTP 200

#### Scenario: 尝试将已发布种子退回草稿
- **WHEN** 用户发送 `POST /api/seeds/draft`，携带已存在的 `id` (状态为 `active` 或 `archived`)
- **THEN** 系统拒绝请求，返回错误提示（状态流转不可逆）

---

### Requirement: 发布种子 (Publish Seed)
系统 SHALL 允许用户发布种子，将其状态置为 `active`。支持直接创建活跃种子，或将现有草稿发布。

#### Scenario: 直接发布新种子
- **WHEN** 用户发送 `POST /api/seeds/publish`，不带 `id`
- **THEN** 系统生成新 ID，状态设为 `active`
- **THEN** 保存数据并写入 Tag Registry
- **THEN** 返回状态为 `active` 的种子信息

#### Scenario: 发布现有草稿
- **WHEN** 用户发送 `POST /api/seeds/publish`，携带现有草稿的 `id`
- **THEN** 系统更新该种子状态为 `active`
- **THEN** 更新相关内容和标签
- **THEN** 返回 HTTP 200

---

### Requirement: 归档与回档
系统 SHALL 提供专门接口管理种子的生命周期终态。

#### Scenario: 归档种子
- **WHEN** 用户发送 `PUT /api/seeds/{seedId}/archive`
- **THEN** 系统将种子状态更新为 `archived`
- **THEN** 系统可能从活跃列表索引中移除该种子（取决于具体实现）

#### Scenario: 回档种子
- **WHEN** 用户发送 `PUT /api/seeds/{seedId}/restore`
- **THEN** 系统将种子状态恢复为 `active`

---

### Requirement: 查询种子列表
系统 SHALL 提供种子列表查询接口，支持按 `status` 和 `tags` 过滤，支持分页（`page` 和 `size` 参数）。列表响应 SHALL 仅包含元数据（id、title、status、tags、createdAt、fruitCount），不包含内容正文。

#### Scenario: 查询全量列表
- **WHEN** 用户发送 `GET /api/seeds`，不携带过滤参数
- **THEN** 系统返回所有种子的元数据列表，按 `createdAt` 降序排列
- **THEN** 响应体包含 `list` 数组和 `total` 总数

#### Scenario: 按状态过滤
- **WHEN** 用户发送 `GET /api/seeds?status=active`
- **THEN** 系统仅返回 `status` 为 `active` 的种子列表

#### Scenario: 分页查询
- **WHEN** 用户发送 `GET /api/seeds?page=2&size=10`
- **THEN** 系统返回第 11-20 条种子，并在响应中包含 `total` 总数

---

### Requirement: 查询种子详情
系统 SHALL 提供按 ID 查询单个种子完整信息的接口，返回元数据与 Markdown 内容正文的合并结果。

#### Scenario: 查询存在的种子
- **WHEN** 用户发送 `GET /api/seeds/{seedId}`，该种子存在
- **THEN** 系统从 Redis 读取元数据，从文件系统读取内容，合并后返回完整 Seed 对象
- **THEN** 响应包含 `id`、`title`、`content`、`status`、`tags`、`createdAt`、`updatedAt`

#### Scenario: 查询不存在的种子
- **WHEN** 用户发送 `GET /api/seeds/{seedId}`，该 ID 不存在
- **THEN** 系统返回 HTTP 404

---

### Requirement: 更新种子信息
系统 SHALL 支持对种子内容信息的更新。**禁止**通过此接口修改 `status`。可更新字段包括 `title`、`content`、`tags`。

#### Scenario: 更新基本信息
- **WHEN** 用户发送 `PATCH /api/seeds/{seedId}`，携带 `title` 或 `content`
- **THEN** 系统更新对应的 Redis 和文件数据
- **THEN** 状态保持不变

#### Scenario: 尝试修改状态
- **WHEN** 用户发送 `PATCH /api/seeds/{seedId}`，Body 中包含 `status` 字段
- **THEN** 系统忽略 `status` 字段，或返回错误（视实现策略而定，建议忽略）
- **THEN** 仅更新其他合法字段

---

### Requirement: 标签管理
系统 SHALL 提供标签的查询和清理接口。

#### Scenario: 获取标签列表
- **WHEN** 用户发送 `GET /api/tags`
- **THEN** 系统返回 Tag Registry 中的所有标签

#### Scenario: 删除标签
- **WHEN** 用户发送 `DELETE /api/tags/{tagName}`
- **THEN** 系统从 Tag Registry 中移除该标签
- **THEN** 不影响已使用该标签的种子数据

---

### Requirement: 种子状态流转 (废弃)
*(此 Requirement 已被拆分为 Save Draft / Publish / Archive 独立接口，不再通过 Update 接口隐式流转)*

---

### Requirement: 删除种子
系统 SHALL 提供物理删除种子的接口。删除操作 SHALL 同时清除 Redis 中的元数据和列表索引，以及文件系统中的 Markdown 文件。

#### Scenario: 成功删除种子
- **WHEN** 用户发送 `DELETE /api/seeds/{seedId}`，该种子存在
- **THEN** 系统删除 Redis Hash `cf:u:{userId}:s:{seedId}:meta`
- **THEN** 系统从 ZSet `cf:u:{userId}:seeds:list` 中移除该 ID
- **THEN** 系统删除对应的 Markdown 文件
- **THEN** 系统返回 HTTP 200

#### Scenario: 删除不存在的种子
- **WHEN** 用户发送 `DELETE /api/seeds/{seedId}`，该 ID 不存在
- **THEN** 系统返回 HTTP 404
