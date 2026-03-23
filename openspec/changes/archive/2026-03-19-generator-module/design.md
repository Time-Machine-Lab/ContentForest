## Context

内容森林当前已完成种子库模块（后端 API + 前端页面），具备基础的 MCP Server 框架和 Redis 存储层。生成器模块是内容生成闭环的核心执行层，负责将种子转化为可发布内容。本次设计涉及后端 API、MCP Tools、文件系统存储、前端页面四个维度。

**当前状态**：
- 已有：Nuxt 3 全栈框架、Redis 存储、MCP Server 框架、用户目录隔离（`/cf/data/{userId}/`）
- 缺少：生成器元数据存储、市场 API、Skill 文件管理、生成编排 Skill

## Goals / Non-Goals

**Goals:**
- 建立生成器元数据的完整数据模型与 Redis 存储
- 实现生成器市场的 CRUD API（上传、列表、安装、卸载）
- 实现生成器 Skill 文件的本地文件系统管理
- 实现生成器相关 MCP Tools，支撑 AI IDE Agent 完成生成编排
- 实现前端生成器市场页和我的生成器页
- 编写 `generation-orchestrator` Skill

**Non-Goals:**
- 果实（Fruit）数据结构与存储（由果实模块实现）
- 营养库内容的创建与编辑（营养库模块负责）
- 生成器 Skill 的安全扫描（最终版本实现，MVP 跳过）
- 付费生成器功能（预留字段但不实装）
- 平台 API 自动发布（投放模块负责）

## Decisions

### 决策 1：生成器元数据与 Skill 完全解耦

**决策**：元数据由平台（Redis）存储和管理，Skill 文件夹由用户本地文件系统管理，两者通过 `generatorId` 关联，互不耦合。

**理由**：用户创建 Skill 时只需关注内容生成逻辑，无需了解平台元数据结构。Skill 可移植到任何 Agent 使用，平台元数据独立演进（如新增 `rating` 字段）不影响 Skill 文件。

**备选方案**：在 Skill 目录中内置 `generator.yaml`。**否决**：增加了用户的认知负担，且 Skill 便携性下降。

### 决策 2：installCount 只增不减

**决策**：`installCount` 在安装时原子性 +1，卸载时不减少。

**理由**：installCount 代表历史安装总量，是生成器质量的社会证明。卸载不代表用户否定该生成器，保持历史数据真实性更有意义。

### 决策 3：MVP 阶段 Skill 上传使用 zip 包

**决策**：用户上传 Skill 时，将整个 Skill 文件夹打包为 zip，服务器解压后存储到平台 Skill 目录。

**理由**：简单直接，无需实现文件树上传。MVP 阶段平台 Skill 存储在本地服务器目录，SaaS 阶段迁移至云端对象存储（路径设计不变）。

### 决策 4：生成器 Agent 为 AI IDE 内置 Agent

**决策**：MVP 阶段不开发独立的生成器 Agent 服务，而是通过 `generation-orchestrator` Skill 让 AI IDE（Cursor/Trae）内置 Agent 承担编排职责。

**理由**：复用 AI IDE 强大的 LLM 能力，零成本启动。生成编排逻辑抽象为 Skill，未来迁移至平台自研 Agent 时，只需替换 Agent 宿主，Skill 与 MCP Tools 无需改动。

### 决策 5：Redis Key 设计（市场侧与用户侧分离）

```
# 市场侧（平台维护）
cf:gen:{genId}:meta        → Hash，生成器元数据
cf:market:gens             → ZSet，市场索引（score = updatedAt）

# 用户侧（用户隔离）
cf:u:{userId}:gens                      → ZSet，已安装列表（score = installedAt）
cf:u:{userId}:gen:{genId}:install       → Hash，安装记录
cf:u:{userId}:genlog:{logId}            → String(JSON)，生成日志
```

**理由**：市场侧数据全局共享，用户侧数据严格隔离，与现有种子库的 Key 命名规范保持一致。

## Risks / Trade-offs

- **[风险] Skill zip 文件过大** → 服务器端限制上传体积（建议 10MB），解压时检查文件数量上限
- **[风险] 文件系统与 Redis 不一致**（如 Skill 文件被手动删除）→ 卸载时文件不存在仅记录 warning，继续清理 Redis，接口返回成功
- **[风险] 生成器市场无内容冷启动** → 平台预置几个官方示例生成器（直接写入 Redis + 本地 Skill 目录）
- **[Trade-off] installCount 不减** → 数据不反映当前活跃安装数，但更真实反映历史热度，与主流应用市场惯例一致

## Migration Plan

MVP 阶段为全新模块，无现有数据迁移。

部署步骤：
1. 创建 `/cf/data/{userId}/generators/` 目录结构
2. 初始化 Redis 市场索引（可选：预置官方生成器数据）
3. 部署后端 API 路由
4. 注册 MCP Tools
5. 将 `generation-orchestrator` Skill 放置到项目 skills 目录
6. 部署前端页面（集成至控制台导航）

## Open Questions

- 平台 Skill 文件存储目录的具体路径（建议 `/cf/platform/generators/{generatorId}/skills/`，待确认）
- 生成器市场是否需要搜索功能（关键词搜索），MVP 阶段暂定只做筛选
- `generation-orchestrator` Skill 存放位置（`.cursor/skills/` vs 项目 `skills/` 目录），待确认
