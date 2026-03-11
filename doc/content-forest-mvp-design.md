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
    *   **Markdown 路径**: `data/{userId}/fruits/xxx.md`。

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

*   **Fruit (果实)**:
    ```markdown
    ---
    id: "fruit_abc"
    seed_id: "seed_001"
    generator_id: "gen_xhs_v1"
    status: "generated" // generated, picked, published, rejected
    metrics: { likes: 0, views: 0 }
    mutation: { applied: true, type: "style_remix" }
    ---
    # 标题
    ...
    ```

### 4.3 生成器与 Skills (Generator & Skills)

*   **Skills**: 独立的 Prompt 模板或逻辑单元（如：`title-generator`, `image-prompter`）。
*   **多平台支持**: 通过配置不同的 Generator（组合不同的 Skills）来实现。
*   **Agent 交互**: Agent 不直接写死逻辑，而是读取 `skills/` 目录下的定义来执行。

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
    *   定义清晰的 MCP Tools 列表：`create_seed`, `save_fruit`, `update_metrics`。

2.  **数据一致性**:
    *   "线上数据" (Redis) 是热数据，"线下数据" (Markdown) 是冷备份。
    *   MVP 阶段：写操作优先写入 Redis，异步/定时同步到 Markdown 文件。或者写入 Markdown 后，通过 File Watcher 同步到 Redis（推荐后者，更符合本地工具直觉）。
    *   *修正*: 考虑到 SaaS 迁移，建议 **写操作通过 API -> Service -> 同时写 Redis 和 Markdown**。这样业务逻辑最统一。

3.  **用户隔离**:
    *   即使是单机 MVP，代码中获取当前用户 ID 的逻辑也应封装为 `getCurrentUser()`。
    *   MVP 中该函数可能固定返回 `local_admin`，但 SaaS 中会从 Session/Token 解析。

4.  **Prompt 管理**:
    *   Prompt 也是代码。将所有 Prompt 模板化（存放在 `prompts/` 目录），不要硬编码在代码里。

## 6. MVP 开发路线图

1.  **基础设施搭建**: 初始化 Nuxt 项目，配置 Redis，搭建 MCP Server 框架。
2.  **核心模块 - 种子**: 实现种子的 CRUD (Markdown + Redis)，Web UI 展示。
3.  **核心模块 - 生成器**: 定义 Generator 结构，实现 Prompt 渲染逻辑。
4.  **Agent 接入**: 编写 MCP Tools，打通 IDE -> API -> DB 的链路。
5.  **核心模块 - 果实**: 实现生成、落库、展示、Pick Up 流程。
6.  **迭代与优化**: 实现手动迭代逻辑，简单的突变算法。