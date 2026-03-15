# Seed Storage Spec

## Purpose

种子存储层采用「动静分离」双层架构：**Redis** 作为热数据层，承载元数据的高频读写和按时间排序的列表查询；**Markdown 文件**作为冷存储层，保存人类可读的内容源文件，同时作为 Redis 数据丢失后的恢复来源。两层数据在写操作时同步双写，读详情时合并，读列表时仅读 Redis。

---

## Requirements

### Requirement: 标签库存储 (Tag Registry)

系统 SHALL 维护一个全局标签库，使用 Redis Set 结构。Key 格式为 `cf:u:{userId}:tags`。

#### Scenario: 自动收集标签

- **WHEN** 种子被保存（Draft 或 Active），且包含 `tags` 字段
- **THEN** 系统将这些标签添加到 `cf:u:{userId}:tags` Set 中

#### Scenario: 标签去重

- **WHEN** 多个种子使用相同标签
- **THEN** Set 中仅存储一份标签字符串

---

### Requirement: Redis 热数据层写入

系统 SHALL 在每次创建或更新种子时，将种子元数据写入 Redis。元数据以 Hash 结构存储，Key 格式为 `cf:u:{userId}:s:{seedId}:meta`。同时 SHALL 将 `seedId` 写入 ZSet `cf:u:{userId}:seeds:list`，Score 为 `createdAt` 时间戳（毫秒），用于按时间排序的分页查询。

#### Scenario: 创建种子时写入 Redis

- **WHEN** 种子创建成功
- **THEN** Redis 中存在 Hash Key `cf:u:{userId}:s:{seedId}:meta`，包含字段 `id`、`title`、`tags`（JSON 字符串）、`status`、`created_at`、`fruit_count`
- **THEN** Redis ZSet `cf:u:{userId}:seeds:list` 中包含该 `seedId`，Score 为 `createdAt` 毫秒时间戳

#### Scenario: 更新种子元数据时同步 Redis

- **WHEN** 种子的 `title`、`status` 或 `tags` 被更新
- **THEN** Redis Hash 中对应字段被更新
- **THEN** 更新操作在单次 Redis Pipeline 中完成（原子性保障）

---

### Requirement: Markdown 冷存储层写入

系统 SHALL 在每次创建或更新种子内容时，将种子写入文件系统。文件路径格式为 `/cf/data/{userId}/seeds/{YYYY}/{seedId}.md`，其中 `{YYYY}` 为创建年份。文件格式 SHALL 为 Markdown + YAML Frontmatter，Frontmatter 包含 `id`、`title`、`created_at`、`updated_at`、`creator_id` 字段。

#### Scenario: 创建种子时写入文件

- **WHEN** 种子创建成功
- **THEN** 文件系统中存在路径 `/cf/data/{userId}/seeds/{YYYY}/{seedId}.md`
- **THEN** 文件包含合法的 YAML Frontmatter（以 `---` 分隔）和 Markdown 正文
- **THEN** Frontmatter 中的 `id` 与 Redis 中的 `id` 一致

#### Scenario: 更新种子内容时同步文件

- **WHEN** 种子的 `content` 或 `title` 被更新
- **THEN** 文件系统中对应文件的内容被更新
- **THEN** Frontmatter 中的 `updated_at` 被同步更新

#### Scenario: 目录不存在时自动创建

- **WHEN** 首次创建某用户某年份的种子
- **THEN** 系统自动创建 `/cf/data/{userId}/seeds/{YYYY}/` 目录
- **THEN** 不抛出目录不存在的错误

---

### Requirement: 读取时数据合并

系统 SHALL 在查询种子详情时，从 Redis 读取元数据，从文件系统读取内容正文，合并为完整的 Seed 对象返回。查询种子列表时 SHALL 仅读取 Redis，不访问文件系统。

#### Scenario: 详情查询合并两层数据

- **WHEN** 用户请求 `GET /api/seeds/{seedId}`
- **THEN** 系统从 Redis Hash 读取 `title`、`status`、`tags`、`created_at`、`fruit_count`
- **THEN** 系统根据 `seedId` 和 `created_at` 定位文件路径，读取 Markdown 文件内容
- **THEN** 返回的响应对象包含来自两层的完整数据

#### Scenario: 列表查询只读 Redis

- **WHEN** 用户请求 `GET /api/seeds`
- **THEN** 系统通过 ZSet 获取 ID 列表，通过 MGET 批量获取 Hash 元数据
- **THEN** 系统不读取任何 Markdown 文件

---

### Requirement: 用户数据隔离

系统 SHALL 在所有存储操作中强制包含 `userId` 维度。Redis Key 必须以 `cf:u:{userId}:` 为前缀，文件路径必须包含 `/{userId}/` 路径段。系统 SHALL 通过 `getCurrentUser()` 工具函数统一获取当前用户 ID，MVP 阶段固定返回 `local_admin`。

#### Scenario: 用户隔离的 Redis Key 格式

- **WHEN** 任意种子存储操作被执行
- **THEN** 操作的 Redis Key 符合 `cf:u:{userId}:s:{seedId}:meta` 或 `cf:u:{userId}:seeds:list` 格式
- **THEN** 不存在不含 `userId` 的种子相关 Key

#### Scenario: MVP 默认用户

- **WHEN** 系统在 MVP 模式下运行
- **THEN** `getCurrentUser()` 返回字符串 `local_admin`
- **THEN** 所有数据存储在 `cf:u:local_admin:*` 命名空间下

---

## Redis Key 设计一览

| Key 格式 | 结构 | 用途 |
|----------|------|------|
| `cf:u:{userId}:s:{seedId}:meta` | Hash | 种子元数据（id、title、tags、status、created_at、fruit_count） |
| `cf:u:{userId}:seeds:list` | ZSet（Score = createdAt ms） | 种子 ID 列表，按创建时间排序 |
| `cf:u:{userId}:tags` | Set | 全局标签库（Tag Registry） |

---

## 文件路径规则

```
{CF_DATA_ROOT}/
└── {userId}/
    └── seeds/
        └── {YYYY}/
            └── {seedId}.md
```

- `CF_DATA_ROOT` 默认为项目根目录下的 `/cf/data/`，可通过环境变量 `CF_DATA_ROOT` 覆盖
- `{YYYY}` 为种子 `createdAt` 的年份（用于按年归档，避免单目录文件过多）
- 文件格式示例：

```markdown
---
id: seed_20260311_abc12345
title: 我的第一颗种子
created_at: 2026-03-11T10:00:00.000Z
updated_at: 2026-03-11T10:00:00.000Z
creator_id: local_admin
---

这里是种子的 Markdown 正文内容。
```

---

## 双写一致性策略

- **写入顺序**：优先写 Redis（主数据源），再写 Markdown 文件（冷备份）
- **失败处理**：Redis 写成功但文件写失败时，记录错误日志，不回滚 Redis（冷备允许短暂不一致）
- **数据恢复**：Redis 数据丢失时，可通过遍历 Markdown 文件重建 Redis 索引
- **持久化要求**：生产环境需启用 Redis AOF 持久化（`appendonly yes`）
