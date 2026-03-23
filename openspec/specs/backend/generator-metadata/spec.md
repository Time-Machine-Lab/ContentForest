## Purpose

定义生成器的核心数据结构，作为存储与传输的统一模型。

## Requirements

### Requirement: 生成器元数据结构

定义生成器的核心数据结构，作为存储与传输的统一模型。

#### Scenario: 创建生成器元数据
- **WHEN** 用户创建一个新的生成器
- **THEN** 系统创建一条包含以下字段的元数据记录：
  - `id`：全局唯一标识符
  - `name`：生成器名称（必填）
  - `description`：功能描述
  - `author`：创建者用户 ID
  - `tags`：标签数组，用于分类与搜索
  - `schema`：输入参数的 JSON Schema 定义
  - `promptTemplate`：生成内容使用的提示词模板
  - `visibility`：可见性，枚举值为 `private` 或 `public`
  - `createdAt` / `updatedAt`：时间戳

#### Scenario: 更新生成器元数据
- **WHEN** 生成器所有者修改生成器信息
- **THEN** 系统更新对应字段，并刷新 `updatedAt` 时间戳
- **AND** `id` 和 `author` 字段不可修改
