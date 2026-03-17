## 1. 数据模型与存储层

- [ ] 1.1 定义 `GeneratorMetadata` TypeScript 接口（id, name, description, platform, contentTypes, domain, author, outputCapabilities, price, installCount, rating, createdAt, updatedAt）
- [ ] 1.2 定义 `GeneratorInstallRecord` TypeScript 接口（generatorId, userId, installedAt, skillPath）
- [ ] 1.3 实现 `GeneratorRepository` 接口及 Redis 实现：写入 `cf:gen:{genId}:meta`、`cf:market:gens` ZSet
- [ ] 1.4 实现 `UserGeneratorRepository` 接口及 Redis 实现：`cf:u:{userId}:gens` ZSet、`cf:u:{userId}:gen:{genId}:install` Hash
- [ ] 1.5 实现生成日志写入：`cf:u:{userId}:genlog:{logId}` + 本地 JSON 文件 `/cf/data/{userId}/logs/generation/{logId}.json`

## 2. 文件系统管理

- [ ] 2.1 实现 Skill 文件夹写入工具函数：将解压后文件写入 `/cf/data/{userId}/generators/{generatorId}/`
- [ ] 2.2 实现 Skill 文件夹删除工具函数：递归删除 `/cf/data/{userId}/generators/{generatorId}/`，目录不存在时记录 warning 不抛错
- [ ] 2.3 实现平台 Skill 存储目录管理（MVP 本地路径：`/cf/platform/generators/{generatorId}/skills/`）
- [ ] 2.4 实现 zip 文件解压工具函数，并校验解压后根目录是否包含 `SKILL.md`

## 3. 后端 API — 生成器市场

- [ ] 3.1 实现 `GET /api/generators/market`：分页查询 `cf:market:gens`，批量读取元数据，支持 platform/domain 过滤
- [ ] 3.2 实现安装状态标注逻辑：当携带 `X-User-Id` 时，批量检查 `cf:u:{userId}:gens` 追加 `isInstalled` 字段
- [ ] 3.3 实现 `GET /api/generators/mine`：分页查询 `cf:u:{userId}:gens`，返回安装记录含 `installedAt` 和 `skillPath`
- [ ] 3.4 实现 `POST /api/generators/{generatorId}/install`：重复安装检查 → 复制 Skill 文件 → 写入 Redis → HINCRBY installCount
- [ ] 3.5 实现 `POST /api/generators/upload`：multipart 解析 → 元数据校验 → zip 解压校验 SKILL.md → 存储 Skill → 写 Redis → 自动安装
- [ ] 3.6 实现 `DELETE /api/generators/{generatorId}/uninstall`：安装记录检查 → 删除本地 Skill → 清理 Redis（不修改 installCount）
- [ ] 3.7 为所有生成器 API 添加 `X-User-Id` 认证中间件，缺失时返回 401

## 4. MCP Tools

- [ ] 4.1 实现 `get_generator({ generatorId })` MCP Tool：返回生成器元数据和当前用户本地 skillPath
- [ ] 4.2 实现 `list_generators({ userId, filter? })` MCP Tool：返回用户已安装生成器列表
- [ ] 4.3 实现 `install_generator({ userId, generatorId })` MCP Tool：调用安装流程并返回 skillPath
- [ ] 4.4 实现 `write_generation_log({ log })` MCP Tool：写入日志文件和 Redis
- [ ] 4.5 实现 `get_nutrients({ userId, paths[] })` MCP Tool：读取指定营养库 Markdown 文件，文件不存在返回 null + warning
- [ ] 4.6 将上述 MCP Tools 注册到现有 MCP Server

## 5. Generation Orchestrator Skill

- [ ] 5.1 编写 `generation-orchestrator` SKILL.md，定义完整生成编排流程（输入要求、MCP Tool 调用顺序、输出展示方式）
- [ ] 5.2 将 SKILL.md 放置到项目约定的 skills 目录（确认路径后执行）
- [ ] 5.3 编写第一个示例生成器 Skill（小红书图文生成器），包含 SKILL.md 和 references/
- [ ] 5.4 将示例生成器数据写入平台存储（作为官方生成器预置数据）

## 6. 前端 — 生成器市场页

- [ ] 6.1 创建生成器市场页面路由和基础布局
- [ ] 6.2 实现平台筛选 Tab 组件（全部 / 小红书 / 抖音 / 推特 / 其他）
- [ ] 6.3 实现生成器卡片组件（展示 name、description、platform tag、author、installCount、price）
- [ ] 6.4 实现分页加载逻辑，调用 `GET /api/generators/market`
- [ ] 6.5 实现安装按钮状态管理（「安装」↔「已安装」），调用 `POST /api/generators/{id}/install`
- [ ] 6.6 将生成器市场页入口添加到控制台导航

## 7. 前端 — 我的生成器页

- [ ] 7.1 创建我的生成器页面路由和基础布局
- [ ] 7.2 实现已安装生成器列表，调用 `GET /api/generators/mine`
- [ ] 7.3 实现生成器详情侧面板（metadata、outputCapabilities、skillPath、installedAt）
- [ ] 7.4 实现「导入生成器」功能：本地 zip 文件选择 → 调用 `POST /api/generators/upload`
- [ ] 7.5 实现「卸载」功能：调用 `DELETE /api/generators/{id}/uninstall`，从列表移除
- [ ] 7.6 将我的生成器页入口添加到控制台导航

## 8. 集成测试

- [ ] 8.1 端到端测试：上传生成器 → 出现在市场 → 其他用户安装 → 本地 Skill 文件存在
- [ ] 8.2 端到端测试：卸载生成器 → 本地文件删除 → Redis 记录清理 → installCount 不变
- [ ] 8.3 在 AI IDE 中完整执行一次生成流程：选择种子 → 选择生成器 → Agent 执行编排 → 生成日志写入
