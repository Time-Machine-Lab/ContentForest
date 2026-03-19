## Why

内容森林的核心价值在于「生成器将种子转化为可发布内容」，但目前系统缺少生成器模块的完整实现。需要建立生成器的存储、市场、安装/卸载机制，以及支撑 AI IDE Agent 完成内容生成编排的 MCP 工具层。

## What Changes

- 新增生成器元数据的存储与管理（Redis + 市场索引）
- 新增「我的生成器」：用户安装生成器到本地文件系统，可被 Agent 加载使用
- 新增「生成器市场」：支持生成器的上传、浏览（分页+筛选）、安装、卸载
- 新增生成器相关后端 API（市场列表、我的列表、安装、上传、卸载）
- 新增生成器 MCP Tools（`get_generator`、`list_generators`、`install_generator`、`write_generation_log`、`get_nutrients`）
- 新增前端页面：生成器市场页、我的生成器页
- 新增 `generation-orchestrator` Skill，编排 AI IDE Agent 完成完整生成流程

## Capabilities

### New Capabilities

- `generator-metadata`: 生成器元数据的数据模型与 Redis 存储（`GeneratorMetadata` 接口、市场索引 ZSet、用户安装记录）
- `generator-market-api`: 生成器市场后端 API（市场列表、上传、安装、卸载、我的生成器列表）
- `generator-storage`: 生成器 Skill 文件的本地文件系统存储（`/cf/data/{userId}/generators/{generatorId}/`）
- `generator-mcp-tools`: 生成器相关 MCP Tools，供 AI IDE Agent 调用
- `generator-market-page`: 前端生成器市场页面（卡片墙、安装功能）
- `my-generators-page`: 前端我的生成器页面（列表、详情、导入）
- `generation-orchestrator-skill`: AI IDE Agent 生成编排 Skill

### Modified Capabilities

- `seed-mcp-tools`: 在现有 MCP Tools 基础上补充 `get_nutrients` 工具（营养库内容获取）

## Impact

- **后端新增**：`/api/generators/market`、`/api/generators/mine`、`/api/generators/:id/install`、`/api/generators/upload`、`/api/generators/:id/uninstall`
- **MCP Server 新增**：`get_generator`、`list_generators`、`install_generator`、`write_generation_log`、`get_nutrients`
- **文件系统新增**：`/cf/data/{userId}/generators/` 目录规范
- **Redis 新增**：`cf:gen:{genId}:meta`、`cf:market:gens`、`cf:u:{userId}:gens`、`cf:u:{userId}:gen:{genId}:install`、`cf:u:{userId}:genlog:{logId}`
- **前端新增**：生成器市场页、我的生成器页（集成至控制台导航）
- **Skill 新增**：`generation-orchestrator` Skill 文件（`.cursor/skills/` 或项目 `skills/` 目录）
- **不影响**：种子库、营养库、果实模块（果实存储由果实模块独立实现）
