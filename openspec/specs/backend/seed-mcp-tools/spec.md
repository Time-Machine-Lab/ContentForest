# Seed MCP Tools Spec

## Purpose

通过 MCP（Model Context Protocol）协议将种子管理能力暴露给 AI Agent，使其能够在 Cursor、Trae 等 AI IDE 中以自然语言驱动种子的创建、查询和状态管理。MCP Server 以 HTTP SSE 方式集成在 `content-forest-backend` 进程中，与 REST API 共享 `SeedService` 业务层。

---

## Requirements

### Requirement: MCP Server 集成

系统 SHALL 在 `content-forest-backend` 进程中集成 MCP Server，使用 **HTTP SSE** 协议。MCP Server SHALL 在系统启动时自动初始化，并注册所有种子相关工具。

#### Scenario: MCP Server 启动

- **WHEN** `content-forest-backend` 进程启动
- **THEN** MCP Server 成功初始化并监听 HTTP SSE 端口（复用主端口的 `/sse` 路径）
- **THEN** 所有种子 MCP 工具被注册并可被调用

---

### Requirement: save_draft MCP 工具

系统 SHALL 提供 `save_draft` MCP 工具，允许 AI Agent 保存草稿。接受 `title`、`content`、`tags` 及可选的 `id`。

#### Scenario: Agent 保存新草稿

- **WHEN** AI Agent 调用 `save_draft` 工具，不传入 `id`
- **THEN** 系统创建新草稿种子，状态为 `draft`
- **THEN** 工具返回新种子的 ID 和状态

#### Scenario: Agent 更新草稿

- **WHEN** AI Agent 调用 `save_draft` 工具，传入已有草稿 `id`
- **THEN** 系统更新草稿内容（title、content、tags）
- **THEN** 工具返回更新后的种子信息

---

### Requirement: publish_seed MCP 工具

系统 SHALL 提供 `publish_seed` MCP 工具，允许 AI Agent 发布种子（变为 Active 状态）。

#### Scenario: Agent 发布种子

- **WHEN** AI Agent 调用 `publish_seed` 工具，传入 `title`、`content`（可选 `id`）
- **THEN** 种子状态变为 `active`
- **THEN** 标签写入 Tag Registry
- **THEN** 工具返回状态为 `active` 的种子信息

---

### Requirement: archive_seed MCP 工具

系统 SHALL 提供 `archive_seed` MCP 工具，允许 AI Agent 归档种子。

#### Scenario: Agent 归档种子

- **WHEN** AI Agent 调用 `archive_seed` 工具，传入 `seedId`
- **THEN** 种子状态变为 `archived`
- **THEN** 工具返回操作成功的确认响应

---

### Requirement: list_seeds MCP 工具

系统 SHALL 提供 `list_seeds` MCP 工具，允许 AI Agent 查询种子列表。工具 SHALL 接受可选的 `status` 过滤参数，返回元数据列表（`id`、`title`、`status`、`tags`、`createdAt`）。

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

- **WHEN** AI Agent 调用 `update_seed_info` 工具，传入 `seedId` 和 `content`（或 `title`、`tags`）
- **THEN** 工具更新种子内容
- **THEN** 种子状态保持不变

#### Scenario: 尝试通过 update_seed_info 修改状态

- **WHEN** AI Agent 传入包含 `status` 字段的参数
- **THEN** 工具不支持 `status` 参数（Schema 层面排除），或静默忽略
- **THEN** 仅更新合法字段

---

## MCP 工具清单

| 工具名 | 对应 REST 接口 | 描述 |
|--------|--------------|------|
| `save_draft` | `POST /api/seeds/draft` | 保存草稿（新建或更新） |
| `publish_seed` | `POST /api/seeds/publish` | 发布种子 |
| `archive_seed` | `PUT /api/seeds/{seedId}/archive` | 归档种子 |
| `list_seeds` | `GET /api/seeds` | 查询种子列表 |
| `get_seed` | `GET /api/seeds/{seedId}` | 获取种子详情（含正文） |
| `update_seed_info` | `PATCH /api/seeds/{seedId}` | 更新种子内容信息 |

---

## MCP Server 技术规格

- **SDK**：`@modelcontextprotocol/sdk`
- **通信协议**：HTTP SSE（Server-Sent Events）
- **端点**：`/sse`（建立 SSE 连接）、`/message`（发送工具调用消息）
- **集成方式**：与 REST API Server 同进程，通过 `app.use` 挂载到 Hono 路由
- **服务层复用**：所有工具 handler 直接调用 `SeedService`，不绕过业务层
- **IDE 配置示例**（`mcp-config.example.json`）：

```json
{
  "mcpServers": {
    "content-forest": {
      "url": "http://localhost:3001/sse"
    }
  }
}
```
