# ContentForest - 内容森林

> AI 内容进化引擎 - MVP 版本

## 项目简介

ContentForest 是一个基于遗传算法和 AI Agent 的自动化内容生产与迭代系统。通过"生成-投放-反馈-迭代"的闭环，让内容在市场反馈中不断自我优化，实现内容的进化式增长。

## 技术栈

- **前端框架**: Nuxt 3 + Vue 3 + TypeScript
- **样式**: Tailwind CSS
- **后端**: Node.js + TypeScript
- **存储**: Redis (线上数据) + 文件系统 (线下数据)
- **AI 集成**: Model Context Protocol (MCP)
- **开发工具**: ESLint + Prettier

## 项目结构

```text
ContentForest/
├── content-forest-front/    # Nuxt 3 前端应用
├── content-forest-backend/  # Node.js + TypeScript 后端服务
│   ├── src/api/
│   ├── src/services/
│   ├── src/repositories/
│   └── src/storage/
├── content-forest-agent/    # Agent 与技能目录
├── data/              # 用户数据目录
├── doc/               # 项目文档
├── specs/             # OpenSpec 规范
└── .specify/          # SpecKit 配置
```

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Redis >= 7.0 (后续集成)

### 安装依赖

```bash
cd content-forest-front && npm install
cd ../content-forest-backend && npm install
```

### 启动开发服务器

```bash
# 前端（Nuxt）
cd content-forest-front && npm run dev

# 后端（Node + TS）
cd ../content-forest-backend && npm run dev
```

访问前端 http://localhost:3000，后端健康检查 http://localhost:4000/health

### 构建生产版本

```bash
cd content-forest-front && npm run build && npm run preview
cd ../content-forest-backend && npm run build && npm run start
```

## 开发规范

### TypeScript

项目使用 TypeScript 严格模式，禁止使用 `any` 类型。

```bash
cd content-forest-front && npx nuxt typecheck
cd ../content-forest-backend && npm run type-check
```

### 代码规范

```bash
cd content-forest-backend && npm run lint
```

### 架构原则

本项目遵循严格的分层架构，详见 [项目宪法](.specify/memory/constitution.md)：

1. **展示层** → MCP/API 层 → 业务逻辑层 → 仓储层 → 存储层
2. 禁止跨层调用
3. 所有数据访问必须包含 `userId` 参数
4. Repository 必须实现统一接口

## 文档

- [项目规划书](doc/内容森林.md) - 完整的项目愿景和设计
- [MVP 设计书](doc/内容森林-MVP项目设计书.md) - MVP 阶段的技术方案
- [项目宪法](.specify/memory/constitution.md) - 架构原则和开发规范
- [OpenSpec 规范](specs/) - 功能规范和设计文档

## 开发流程

本项目使用 OpenSpec + SpecKit 进行需求管理和开发：

1. 创建 Feature: `.specify/scripts/bash/create-new-feature.sh "功能描述"`
2. 编写 Spec: 在 `specs/###-feature-name/spec.md` 中定义需求
3. 实施开发: 按照 Spec 进行开发
4. 代码审查: 确保符合宪法原则
5. 合并代码: 完成后合并到主分支

## License

Private - 内部使用

## 联系方式

项目负责人: [待补充]
