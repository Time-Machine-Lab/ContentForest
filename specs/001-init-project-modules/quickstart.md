# Quickstart: ContentForest 三模块项目初始化

## 目标

在仓库根目录建立并验证三个标准模块目录：

- `content-forest-front`
- `content-forest-backend`
- `content-forest-agent`

## 前置条件

- Node.js >= 18
- npm >= 9
- 在仓库根目录执行命令

## 执行步骤

1. 确认仓库存在三个模块目录：`content-forest-front`、`content-forest-backend`、`content-forest-agent`。
2. 进入前端模块安装依赖并启动 Nuxt：
   `cd content-forest-front && npm install && npm run dev`
3. 进入后端模块安装依赖并启动服务：
   `cd ../content-forest-backend && npm install && npm run dev`
4. 访问 `http://localhost:4000/health` 验证后端健康检查返回 `status=ok`。

## 验收检查

1. 仓库顶层存在且仅按标准命名识别三个目标模块目录。
2. 任一模块可以独立进入并开展本模块后续初始化。
3. 初始化结果中 `missingModules` 与 `nameConflicts` 为空。

## 推荐后续动作

1. 在 `content-forest-front` 初始化 Nuxt + TypeScript 基础工程。
2. 在 `content-forest-backend` 初始化 Node.js + TypeScript 服务骨架与分层目录。
3. 在 `content-forest-agent` 初始化 MCP 接入框架与 skills 目录规范。
