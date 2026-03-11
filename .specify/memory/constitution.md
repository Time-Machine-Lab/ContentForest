<!--
SYNC IMPACT REPORT
Version change: 1.0.1 → 1.1.0
List of modified principles:
- [New] TECH_STACK: Defined official technology stack (Nuxt/TS, Redis, MCP).
Added sections: 1.7 Tech Stack Standards.
Removed sections: None.
Templates requiring updates: None.
Follow-up TODOs: None.
-->

# 项目宪法 (Project Constitution)

> **版本:** 1.1.0
> **批准日期:** 2026-03-09
> **最后修订:** 2026-03-09

本文档是 **内容森林 (Content Forest)** 项目的最高法则。所有的架构决策、实施计划和代码变更都**必须**遵循这些原则。

---

## 1. 核心原则 (Core Principles)

### 1.1 人机协同 (Human-in-the-Loop, HITL)
**人类是园丁，AI 是工蚁。**
系统**必须**赋予人类判断力（"Pick Up"）作为内容进化的主要过滤器。自动化**绝不能**取代人类意图，而是要放大它。所有的生成工作流**必须**包含一个明确的决策点，供人类在发布或迭代前进行审查。

### 1.2 进化优先 (Evolution First)
**适者生存的内容。**
系统**必须**优先考虑迭代和反馈闭环，而非追求一次性生成的完美。功能**必须**支持 "种子 -> 果实 -> 反馈 -> 迭代" 的循环。数据结构**必须**追踪内容的谱系（家谱），以支持进化分析。

### 1.3 架构解耦 (Architecture Decoupling)
**逻辑存在于核心，而非工具中。**
业务逻辑（生成规则、评分、变异）**必须**在核心应用层（API/Service）中实现，独立于 Agent 或 IDE。Agent/IDE **必须**仅通过标准化协议（MCP）作为接口/驱动程序运行，确保系统保持可移植性并为迁移（SaaS）做好准备。

### 1.4 资产沉淀 (Asset Accumulation)
**Prompt 和数据才是真正的价值。**
系统**必须**将 Prompt、成功的“基因”（内容模式）和表现数据视为一等资产。这些资产**必须**被存储、版本化和可检索（例如，通过营养库），以驱动系统的“复利效应”。

### 1.5 协议驱动交互 (Protocol-Driven Interaction)
**标准化的通信。**
所有 Agent 与系统的交互**必须**通过模型上下文协议（MCP）或严格定义的 API 进行。Agent **绝不能**在不通过应用层定义的工具的情况下直接操作文件系统或数据库状态。

### 1.6 SaaS 就绪的隔离 (SaaS-Ready Isolation)
**从第一天起就为规模化而构建。**
即使在 MVP 阶段，所有的数据存储和访问模式也**必须**在设计时考虑到用户隔离（User ID 上下文）。**必须**避免全局状态，以便未来迁移到多租户 SaaS 架构。

### 1.7 开发技术栈 (Development Tech Stack)
**统一且现代化的工具链。**
项目开发**必须**遵循以下技术选型，以确保一致性和开发效率：
- **框架**: Nuxt (Vue 3 + TypeScript) 用于全栈开发。
- **语言**: TypeScript 作为前后端统一语言。
- **存储**: Redis 用于结构化热数据，Markdown + YAML Frontmatter 用于内容源文件。
- **协议**: Model Context Protocol (MCP) 用于 Agent 集成。

---

## 2. 治理 (Governance)

### 2.1 修订程序 (Amendment Procedure)
对本宪法的任何更改都需要进行语义版本升级。
- **主版本 (X.0.0)**: 项目愿景的根本转变或核心原则的移除。
- **次版本 (0.X.0)**: 新原则的添加或现有原则的重大扩展。
- **修订版本 (0.0.X)**: 澄清、措辞调整或非实质性的改进。

### 2.2 合规性 (Compliance)
所有的 Pull Request 和设计规范**必须**根据这些原则进行审查。违反之处**必须**在合并前解决。
