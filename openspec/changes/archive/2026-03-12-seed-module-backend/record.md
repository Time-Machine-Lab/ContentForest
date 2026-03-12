# 本次 Change 完整交付物
```
content-forest-backend/
├── src/
│   ├── config.ts                          ← 统一配置
│   ├── domain/seed.ts                     ← 领域模型 + 状态机
│   ├── middleware/user-context.ts         ← 用户上下文
│   ├── repositories/
│   │   ├── seed-repository.ts             ← 仓储接口
│   │   └── redis-seed-repository.ts       ← Redis 实现
│   ├── storage/
│   │   ├── redis-client.ts                ← ioredis 单例
│   │   └── file-storage.ts                ← Markdown 冷存储
│   ├── services/seed-service.ts           ← 业务逻辑层
│   ├── api/
│   │   ├── seeds.ts                       ← Hono 路由
│   │   └── server.ts                      ← Hono app + MCP 分发
│   ├── mcp/
│   │   ├── seed-tools.ts                  ← MCP 工具定义
│   │   └── server.ts                      ← MCP SSE Server
│   └── index.ts                           ← 启动入口
├── .env                                   ← 本地配置（不提交）
├── .env.example                           ← 配置模板（提交）
└── mcp-config.example.json                ← Cursor/Trae MCP 接入示例
```

# 集成测试结果
| 测试项                                 | 结果                                     |
|--------------------------------------|----------------------------------------|
| POST /api/seeds/draft 创建草稿         | ✅ Redis Hash + ZSet + Markdown 文件三路写入正确 |
| GET /api/seeds 列表 + status 过滤      | ✅ 分页、过滤均正常                           |
| GET /api/seeds/:id 详情               | ✅ 返回 Redis 元数据 + Markdown content 合并结果  |
| POST /api/seeds/publish 合法流转 draft→active | ✅ 状态正确变更                          |
| POST /api/seeds/publish 重复发布（active→active） | ✅ 返回 400                        |
| POST /api/seeds/draft 非法流转 active→draft    | ✅ 返回 400                          |
| PATCH /api/seeds/:id 更新 title/tags  | ✅ status 保持不变                             |
| PATCH 含 status 字段                   | ✅ status 字段被忽略，仅更新合法字段                |
| PUT /api/seeds/:id/archive 归档        | ✅ 状态变为 archived                        |
| GET /api/tags 标签库                   | ✅ 自动收集所有标签                            |
| DELETE /api/seeds/:id 删除             | ✅ Redis + 文件同步清除                          |
| 删除后 GET                            | ✅ 返回 404                                 |