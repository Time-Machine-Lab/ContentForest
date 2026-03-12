## ADDED Requirements

### Requirement: MCP Server 集成
系统 SHALL 在 `content-forest-backend` 进程中集成 MCP Server，使用 **HTTP SSE** 协议。MCP Server SHALL 在系统启动时自动初始化，并注册所有种子相关工具。

#### Scenario: MCP Server 启动
- **WHEN** `content-forest-backend` 进程启动
- **THEN** MCP Server 成功初始化并监听 HTTP SSE 端口（或复用主端口的 `/sse` 路径）
- **THEN** 所有种子 MCP 工具被注册并可被调用

---

### Requirement: save_draft MCP 工具
系统 SHALL 提供 `save_draft` MCP 工具，允许 AI Agent 保存草稿。接受 `title`、`content`、`tags` 及可选的 `id`。

#### Scenario: Agent 保存新草稿
- **WHEN** AI Agent 调用 `save_draft` 工具
- **THEN** 系统创建新草稿种子，返回 ID

#### Scenario: Agent 更新草稿
- **WHEN** AI Agent 调用 `save_draft` 工具，传入已有草稿 ID
- **THEN** 系统更新草稿内容

---

### Requirement: publish_seed MCP 工具
系统 SHALL 提供 `publish_seed` MCP 工具，允许 AI Agent 发布种子（变为 Active 状态）。

#### Scenario: Agent 发布种子
- **WHEN** AI Agent 调用 `publish_seed` 工具
- **THEN** 种子状态变为 `active`，并写入 Tag Registry

---

### Requirement: archive_seed MCP 工具
系统 SHALL 提供 `archive_seed` MCP 工具，允许 AI Agent 归档种子。

#### Scenario: Agent 归档种子
- **WHEN** AI Agent 调用 `archive_seed` 工具，传入 `seedId`
- **THEN** 种子状态变为 `archived`

---

### Requirement: list_seeds MCP 工具
系统 SHALL 提供 `list_seeds` MCP 工具，允许 AI Agent 查询种子列表。工具 SHALL 接受可选的 `status` 过滤参数，返回元数据列表（id、title、status、tags、createdAt）。

#### Scenario: Agent 查询活跃种子列表
- **WHEN** AI Agent 调用 `list_seeds` 工具，传入 `status: "active"`
- **THEN** 工具返回所有 `active` 状态的种子元数据列表
- **THEN** 结果按 `createdAt` 降序排列

#### Scenario: 无过滤条件时返回全量列表
- **WHEN** AI Agent 调用 `list_seeds` 工具，不传入任何参数
- **THEN** 工具返回该用户下所有种子的元数据列表

---

### Requirement: get_seed MCP 工具
系统 SHALL 提供 `get_seed` MCP 工具，允许 AI Agent 通过 `seedId` 获取种子完整信息（包含内容正文），以便在生成果实前读取种子详情。

#### Scenario: Agent 读取种子详情
- **WHEN** AI Agent 调用 `get_seed` 工具，传入有效 `seedId`
- **THEN** 工具返回包含 `content` 正文的完整 Seed 对象
- **THEN** 返回数据与 `GET /api/seeds/{seedId}` REST API 响应一致

#### Scenario: 种子不存在时返回错误
- **WHEN** AI Agent 调用 `get_seed` 工具，传入不存在的 `seedId`
- **THEN** 工具返回结构化错误响应，说明种子不存在

---

### Requirement: update_seed_info MCP 工具
系统 SHALL 提供 `update_seed_info` MCP 工具，允许 AI Agent 更新种子的内容信息（不含状态）。

#### Scenario: Agent 更新种子信息
- **WHEN** AI Agent 调用 `update_seed_info` 工具，传入 `seedId` 和 `content`
- **THEN** 工具更新种子内容，状态保持不变

#### Scenario: 尝试通过 Update 修改状态
- **WHEN** AI Agent 尝试修改状态
- **THEN** 工具应当不支持 status 参数，或忽略之
