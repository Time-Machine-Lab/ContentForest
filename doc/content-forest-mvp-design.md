# Content Forest MVP 设计文档

> 版本：v1.0 (MVP)
> 日期：2026-03-09
> 状态：规划中

## 1. 项目概述与愿景

**Content Forest (内容森林)** 是一个基于 AI 的自动化内容进化引擎。
MVP 阶段的目标是构建一个**"Human-in-the-loop"（人机协同）的本地化内容生产环境**，验证核心的"进化论"算法与内容生成质量。

**发展路线**：
1.  **MVP (Current)**: 本地化工具。核心逻辑跑通，通过 AI IDE + 本地 Web UI 进行管理。
2.  **SaaS (Future)**: 云端服务。核心逻辑无缝迁移，支持多用户、团队协作与大规模自动化。

---

## 2. 技术栈选型 (Tech Stack)

基于"利于迁移"和"快速开发"的原则，MVP 采用以下技术栈：

| 模块 | 技术选型 | 理由 |
| :--- | :--- | :--- |
| **前端/全栈框架** | **Nuxt (Vue 3 + TypeScript)** | 1. 熟悉度高，开发效率快。<br>2. 服务端渲染 (SSR) 和 API 路由支持良好，利于后续 SaaS 化。<br>3. 对 SSE (Server-Sent Events) 支持友好，方便实现打字机效果。 |
| **存储层 (Cache/DB)** | **Redis** (主要) + **Markdown** (源文件) | 1. Redis 读写速度快，适合高频的读写操作。<br>2. 结构简单 (Key-Value)，适合 MVP 快速迭代数据结构。<br>3. Markdown 作为"冷数据"或"源文件"备份，方便人工查看和编辑。 |
| **AI 驱动 (Agent)** | **AI IDE (Trae/Cursor) + MCP** | 1. 利用 IDE 内置的强大 LLM 能力，零成本启动。<br>2. **MCP (Model Context Protocol)** 作为桥梁，标准化 Agent 与系统的交互。 |
| **语言** | **TypeScript** | 前后端统一语言，类型安全，利于维护和重构。 |

---

## 3. 系统架构设计 (Architecture)

### 3.1 混合架构模式 (Hybrid Model)

MVP 采用 **"本地服务器 + AI 辅助"** 的架构：

*   **Web UI (Nuxt)**: 提供可视化的管理界面（种子管理、果实墙、数据看板）。
*   **Local Server (Nuxt Server / Nitro)**: 处理业务逻辑、读写 Redis、提供 API。
*   **AI IDE (Agent)**: 作为"操作员"和"大脑"。用户在 IDE 中通过对话驱动 Agent，Agent 通过 MCP 协议调用 Local Server 的 API 来执行实际操作（如生成果实、存入数据库）。

### 3.2 核心数据流

1.  **用户输入**: 用户在 IDE 聊天框输入指令（如："/生成 3 个关于 AI 的小红书标题"）。
2.  **Agent 决策**: IDE 的 Agent 解析意图，调用 MCP 工具（如 `generate_fruit`）。
3.  **MCP 执行**: MCP Server (集成在 Nuxt Server 中) 接收请求。
4.  **逻辑处理**: Nuxt Server 执行生成逻辑（加载 Prompt、调用 LLM - 可选、组装数据）。
5.  **数据落库**:
    *   **线上数据 (Online)**: 存入 Redis（结构化数据，用于索引和查询）。
    *   **线下数据 (Offline)**: 生成/更新 Markdown 文件（内容源文件）。
6.  **前端更新**: Web UI 轮询或通过 SSE 接收变更，实时展示新生成的果实。

---

## 4. 核心模块设计 (Core Modules)

### 4.1 存储层设计 (Storage Layer) - *关键*

#### 4.1.1 文件系统目录结构 (File System Structure)

为了规范化数据存储并支持多用户隔离，采用以下目录结构：

*   **根目录 (Root)**: `/cf`
*   **数据目录 (Data)**: `/cf/data`
*   **用户目录 (User Scope)**: `/cf/data/{userId}` (所有用户数据以此隔离)
*   **模块目录 (Modules)**:
    *   **种子库**: `/cf/data/{userId}/seeds/{YYYY}/{seed_id}.md` (按年份归档)
    *   **果实库**: `/cf/data/{userId}/fruits/{YYYY}/{MM}/{fruit_id}.md` (按年月归档)
    *   **生成器库**: `/cf/data/{userId}/generators/{generatorId}/skills/` (用户私有生成器 Skill)
        *   `SKILL.md` — 生成核心主文件
        *   `references/` — 参考资料（可选）
        *   *注：生成器元数据（名称、平台、安装数等）由平台存储在 Redis / 云端，不在此目录*
    *   **营养库**: `/cf/data/{userId}/nutrients/`
    *   **生成日志**: `/cf/data/{userId}/logs/generation/{generation_id}.json`

#### 4.1.2 仓储模式设计 (Repository Pattern)

为了应对未来从 Redis 迁移到 SQLite/ES 的需求，必须严格遵循 **Repository Pattern (仓储模式)**。

*   **设计原则**: 业务逻辑层 **只依赖接口**，不依赖具体实现。
*   **Interface 定义**:
    ```typescript
    interface FruitRepository {
      save(fruit: Fruit): Promise<void>;
      findById(id: string): Promise<Fruit | null>;
      findBySeedId(seedId: string): Promise<Fruit[]>;
      // ...
    }
    ```
*   **Redis 实现**: `RedisFruitRepository` (MVP 使用)。
*   **用户隔离 (User Isolation)**:
    *   虽然 MVP 是本地运行，但为了 SaaS 铺路，所有数据存储必须带上 `userId` 维度。
    *   **Redis Key 设计**: `app:user:{userId}:fruit:{fruitId}`。
    *   **Markdown 路径**: `/cf/data/{userId}/fruits/xxx.md`。

### 4.2 实体与元数据 (Entities & Metadata)

所有核心实体（种子、果实、营养库）均采用 **Markdown + YAML Frontmatter** 的形式，兼顾可读性与结构化。

*   **Seed (种子)**:
    ```markdown
    ---
    id: "seed_001"
    user_id: "user_123"
    created_at: "2026-03-09T10:00:00Z"
    platform: "xiaohongshu"
    status: "active"
    tags: ["ai", "efficiency"]
    ---
    # 核心意图
    推广 Content Forest 工具...
    ```

*   **Fruit (果实)**：采用**容器格式（Container Pattern）**设计，固定容器 + 自由载荷：

    ```typescript
    interface Fruit {
      // 系统固定字段
      id: string;
      userId: string;
      seedId: string;
      parentFruitId?: string;      // 迭代生成时存在
      generatorId: string;         // 产出此果实的生成器 ID
      generatorVersion: string;
      status: 'generated' | 'picked' | 'published' | 'rejected';
      createdAt: number;
      mutation: { applied: boolean; type?: string; styleLabel?: string; };

      // 最小展示契约（生成器必须填写）
      preview: {
        title: string;             // 用于果实池卡片展示
        summary: string;           // 一句话摘要
        contentType: string;       // 'text' | 'image_text' | 'video_script' | ...
      };

      // 生成器自由载荷（完全由生成器定义，系统不解析）
      payload: Record<string, any>;

      metrics?: FruitMetrics;      // 发布后由监控器写入
    }
    ```

    **设计价值**：`payload` 不受系统约束，适配任意平台和生成器；`preview` 是系统与生成器之间的松耦合展示契约，确保果实池可以正常渲染。果实同时记录 `generatorId` 与 `generatorVersion`，实现果实与生成器的完整关联溯源。

### 4.3 生成器与 Skills (Generator & Skills)

生成器由**外部元数据**和**生成核心（Skill）**两部分组成。

#### 生成器组成

*   **外部元数据 (`generator.yaml`)**: 用于平台展示与管理。包含名称、作者、适用平台、版本、`install_count`、`price`（预留）、`output_capabilities` 等字段。
*   **生成核心 (`skills/`)**: 标准 Skill 文件夹，定义生成逻辑。生成器只关注如何生成内容，不感知营养库和 MCP，具备完全可移植性。

#### 生成器与用户关系

*   生成器由用户/平台发布，MVP 阶段支持**导入**功能。
*   其他用户可从**生成器市场**安装，安装后成为**我的生成器**，存储在 `/cf/data/{userId}/generators/{generatorId}/`。
*   生成时用户选择「我的生成器」；选择平台生成器时自动安装。
*   在**营养汲取**阶段，可使用 skill-creator 工具迭代优化「我的生成器」。

#### 生成器 Agent

MVP 阶段使用 **AI IDE（Cursor/Trae）内置 Agent** 作为生成器 Agent。需实现一个 `generation-orchestrator` Skill，编排完整的生成流程：

```
用户在 AI IDE 输入指令
  → Agent 读取 generation-orchestrator Skill
  → MCP: get_seed / get_fruit（获取输入内容）
  → MCP: get_nutrients（获取营养库，可选）
  → 加载生成器 Skill，组装 Prompt，调用 LLM 生成多个果实
  → MCP: save_fruits（保存果实）
  → MCP: write_generation_log（记录日志）
  → 展示结果，等待用户 Pick Up
```

最终阶段将 Agent 替换为平台自研 Agent，**流程逻辑完全一致**，唯一变量是 Agent 的宿主环境。

### 4.4 监控与迭代 (Monitor & Iteration)

*   **监控器 (Monitor)**: MVP 阶段仅定义接口 `MonitorInterface`。实现上提供一个"手动录入数据"的 API/页面即可。
*   **迭代 (Iteration)**:
    *   **手动触发**: 用户在 Web UI 上点击"基于此果实迭代"。
    *   **逻辑**: 将选中的 Fruit 内容作为 Context，作为新的 Prompt 输入，再次调用生成流程。

### 4.5 基因突变 (Mutation)

*   **设计**: 定义 `MutationStrategy` 接口。
*   **MVP 实现**: `RandomStyleMutation` (随机选择一种风格 Prompt)。保留扩展能力，未来接入更复杂的算法。

---

## 5. 特别注意事项 (Key Considerations)

1.  **MCP 集成**:
    *   Agent 生成果实后落库的操作，**必须**通过 MCP 工具调用 API 完成，禁止 Agent 直接修改数据库文件（防止并发冲突和逻辑不一致）。
    *   **种子模块 MCP Tools**：`create_seed`, `publish_seed`, `update_seed`, `archive_seed`
    *   **生成器模块 MCP Tools**：`get_generator`, `list_generators`, `install_generator`, `save_fruits`, `pick_fruit`, `write_generation_log`, `get_nutrients`

2.  **数据一致性**:
    *   "线上数据" (Redis) 是热数据，"线下数据" (Markdown) 是冷备份。
    *   MVP 阶段：写操作优先写入 Redis，异步/定时同步到 Markdown 文件。或者写入 Markdown 后，通过 File Watcher 同步到 Redis（推荐后者，更符合本地工具直觉）。
    *   *修正*: 考虑到 SaaS 迁移，建议 **写操作通过 API -> Service -> 同时写 Redis 和 Markdown**。这样业务逻辑最统一。

3.  **用户隔离**:
    *   即使是单机 MVP，代码中获取当前用户 ID 的逻辑也应封装为 `getCurrentUser()`。
    *   MVP 中该函数可能固定返回 `local_admin`，但 SaaS 中会从 Session/Token 解析。

4.  **Prompt 管理**:
    *   Prompt 也是代码。将所有 Prompt 模板化（存放在 `prompts/` 目录），不要硬编码在代码里。

## 6. 前端交互流程 (Frontend User Flow)

### 6.1 核心工作流程

```
a. 用户进入工作台 (Dashboard)
   ↓
b. 访问种子库模块 (Seed Repository)
   ↓
c. 种子卡片墙展示 (Seed Card Wall)
   - 用户可在卡片墙上进行操作（编辑、删除、发布、生成等）
   ↓
d. 点击某个种子进入种子工作区 (Seed Workspace)
   ↓
e. 种子工作区 (核心工作区)
   - 呈现为动效生动的树状图结构
   - 种子为根节点，果实为分支节点
   - 支持多代迭代：种子 → 果实 → 果实的果实 → ...
   - 核心操作全部在此完成：
     * 果实生成 (Fruit Generation)
     * 营养库选择 (Nutrient Selection)
     * 基因突变配置 (Mutation Configuration)
     * 果实 Pick Up 决策 (Fruit Selection)
     * 迭代生成 (Iteration Generation)
```

### 6.2 页面结构

**当前前端页面**：
- 首页/落地页 (Landing Page)
- Demo 页 (Demo Page)
- **新增：控制台 (Dashboard)** ← 本次提案重点

**控制台内部结构**：
```
┌─────────────────────────────────────────────────────┐
│  Content Forest  │  [搜索]  │  [用户菜单]          │  ← 顶部导航
├─────────────────────────────────────────────────────┤
│ 📌 快速操作栏                                        │
│ [+ 新种子] [生成] [我的果实] [数据看板] [设置]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  主内容区（动态切换）                               │
│  - 种子库视图（卡片墙）                             │
│  - 种子工作区（树状图）                             │
│  - 果实管理视图                                     │
│  - 数据看板视图                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 种子库视图 (Seed Repository View)

**卡片墙设计**：
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 🌱 AI 工具   │  │ 🌱 个人品牌  │  │ 🌱 健身技巧  │
│ 推荐         │  │ 建设         │  │              │
│              │  │              │  │              │
│ 活跃 • 12个  │  │ 活跃 • 8个   │  │ 草稿 • 3个   │
│ 果实         │  │ 果实         │  │ 果实         │
│              │  │              │  │              │
│ [编辑] [生成]│  │ [编辑] [生成]│  │ [编辑] [发布]│
└──────────────┘  └──────────────┘  └──────────────┘
```

**卡片信息**：
- 种子标题
- 状态标签（草稿/活跃/归档）
- 果实数量统计
- 快速操作按钮（编辑、生成、发布、删除等）

### 6.4 种子工作区视图 (Seed Workspace View)

**树状图结构**：
```
                    🌱 种子：AI 工具推荐
                           │
                ┌──────────┼──────────┐
                │          │          │
              🍎A        🍎B        🍎C
            (小红书)    (推特)     (知乎)
              │          │          │
         ┌────┴────┐     │     ┌────┴────┐
         │         │     │     │         │
       🍎A1      🍎A2  🍎B1  🍎C1     🍎C2
      (优化)    (视频)  (改编) (迭代)   (迭代)
```

**工作区功能**：
- 左侧：树状图展示（可交互、可拖拽）
- 右侧：节点详情面板
  - 节点内容预览
  - 操作按钮（编辑、删除、迭代、Pick Up 等）
  - 数据统计（如果有）

### 6.5 生成流程 (Generation Flow)

**分步骤向导式**：
```
第 1 步：选择种子
第 2 步：选择平台
第 3 步：配置生成参数
第 4 步：预览生成结果
第 5 步：Pick Up 决策
```

---

## 7. MVP 开发路线图

### 第一阶段：控制台 + 种子库（本次提案）

1.  **基础设施搭建**: 初始化 Nuxt 项目，配置 Redis，搭建 MCP Server 框架。
2.  **核心模块 - 种子**: 实现种子的 CRUD (Markdown + Redis)，Web UI 展示。
3.  **UI 实现 - 控制台**: 实现顶部导航、快速操作栏、主内容区框架。
4.  **UI 实现 - 种子库**: 实现卡片墙设计，支持基本操作（编辑、删除、发布）。
5.  **前后端联调**: 种子库与后端 API 联调，实现完整的 CRUD 流程。

### 第二阶段：生成器模块

6.  **基础设施**: 定义 `Fruit` TypeScript 接口（容器格式 + payload + preview），实现果实与生成器的文件系统存储。
7.  **MCP Tools**: 实现 `get_generator`、`list_generators`、`install_generator`、`save_fruits`、`pick_fruit`、`write_generation_log`。
8.  **生成编排 Skill**: 编写 `generation-orchestrator` Skill；编写第一个示例生成器（小红书图文生成器）。
9.  **端到端测试**: 在 AI IDE 中完成「种子 → 生成 → Pick Up」完整流程验证。
10. **前端 - 生成器市场**: 实现生成器市场卡片墙页面（导入/安装功能）。
11. **前端 - 我的生成器**: 实现我的生成器管理页面。

### 第三阶段：种子工作区

12. **树状图组件**: 开发动效生动的树状图组件。
13. **果实池**: 实现果实的展示（基于 `preview` 契约渲染卡片）、Pick Up 流程。
14. **迭代逻辑**: 实现基于果实的迭代生成（`parentFruitId` 关联）。

### 第四阶段：数据看板 + 监控

15. **数据看板**: 实现时间线故事线设计的数据看板。
16. **监控器**: 实现手动数据录入的监控器。
17. **对比视图**: 实现果实的对比视图（可选）。