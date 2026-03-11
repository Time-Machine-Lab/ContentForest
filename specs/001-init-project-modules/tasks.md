# Tasks: ContentForest 三模块项目初始化

**Input**: Design documents from `/specs/001-init-project-modules/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本特性规范未强制要求先写测试，本任务清单以实现与验收为主。

**Organization**: 任务按用户故事分组，确保每个故事可以独立实现与独立验收。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件且无未完成依赖）
- **[Story]**: 对应用户故事（US1、US2、US3）
- 每条任务都包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立三模块初始化所需的项目级骨架与执行入口

- [X] T001 创建初始化工具目录与入口文件 `tools/module-init/initialize-modules.ts`
- [X] T002 创建初始化命令定义 `tools/module-init/contracts.ts`
- [X] T003 [P] 创建初始化参数样例 `tools/module-init/module-init.config.json`
- [X] T004 [P] 创建根级脚本封装 `scripts/initialize-modules.sh`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 实现所有用户故事共享的核心能力，完成前阻塞全部用户故事

**⚠️ CRITICAL**: 本阶段完成前不得进入任何用户故事实现

- [X] T005 实现结构规则与命名常量 `tools/module-init/structure-rules.ts`
- [X] T006 [P] 实现目录扫描与冲突识别 `tools/module-init/detect-structure.ts`
- [X] T007 [P] 实现目录创建与幂等补齐逻辑 `tools/module-init/apply-structure.ts`
- [X] T008 实现初始化结果模型映射 `tools/module-init/outcome-model.ts`
- [X] T009 实现结果输出与错误码规范 `tools/module-init/print-outcome.ts`
- [X] T010 在入口编排 dryRun 与正式执行流程 `tools/module-init/initialize-modules.ts`

**Checkpoint**: 初始化基础能力可运行，且能输出 success/partial_fixed/failed 结果

---

## Phase 3: User Story 1 - 建立统一三模块骨架 (Priority: P1) 🎯 MVP

**Goal**: 一次执行完成 `content-forest-front`、`content-forest-backend`、`content-forest-agent` 三目录的创建与确认

**Independent Test**: 在仓库根目录执行初始化命令后，三个目标目录全部存在且命名完全一致

### Implementation for User Story 1

- [X] T011 [US1] 在前端模块创建基础目录 `content-forest-front/app/.gitkeep`
- [X] T012 [P] [US1] 在后端模块创建基础目录 `content-forest-backend/src/.gitkeep`
- [X] T013 [P] [US1] 在Agent模块创建基础目录 `content-forest-agent/mcp/.gitkeep`
- [X] T014 [US1] 在后端模块补齐服务分层目录 `content-forest-backend/src/services/.gitkeep`
- [X] T015 [P] [US1] 在后端模块补齐仓储与存储目录 `content-forest-backend/src/repositories/.gitkeep`
- [X] T016 [P] [US1] 在Agent模块补齐skills目录 `content-forest-agent/skills/.gitkeep`
- [X] T017 [US1] 在初始化入口落地三模块创建调用 `tools/module-init/initialize-modules.ts`

**Checkpoint**: User Story 1 可独立验收并可作为最小可交付版本

---

## Phase 4: User Story 2 - 支持模块独立启动与演进 (Priority: P2)

**Goal**: 让三模块具备独立初始化与独立演进边界，减少跨模块耦合

**Independent Test**: 任意进入一个模块目录可执行该模块初始化准备，不要求修改其他模块目录

### Implementation for User Story 2

- [X] T018 [US2] 初始化前端模块清单文件 `content-forest-front/package.json`
- [X] T019 [P] [US2] 初始化后端模块清单文件 `content-forest-backend/package.json`
- [X] T020 [P] [US2] 初始化Agent模块清单文件 `content-forest-agent/package.json`
- [X] T021 [US2] 在前端模块声明独立启动命令 `content-forest-front/package.json`
- [X] T022 [US2] 在后端模块声明独立启动命令 `content-forest-backend/package.json`
- [X] T023 [US2] 在Agent模块声明独立启动命令 `content-forest-agent/package.json`

**Checkpoint**: User Story 2 完成后，三模块可独立进入并开展后续开发

---

## Phase 5: User Story 3 - 统一命名与协作认知 (Priority: P3)

**Goal**: 固化命名标准与冲突修正输出，降低协作歧义

**Independent Test**: 对不规范目录执行 dryRun 可得到冲突项与修正动作，规范目录返回 success

### Implementation for User Story 3

- [X] T024 [US3] 实现非法命名检测与冲突清单生成 `tools/module-init/detect-structure.ts`
- [X] T025 [P] [US3] 实现标准命名校验器 `tools/module-init/validate-naming.ts`
- [X] T026 [P] [US3] 实现修正动作建议生成器 `tools/module-init/suggest-actions.ts`
- [X] T027 [US3] 在输出层追加冲突与建议动作字段 `tools/module-init/print-outcome.ts`
- [X] T028 [US3] 在契约文件同步最终输入输出样例 `specs/001-init-project-modules/contracts/module-initialization-contract.md`

**Checkpoint**: User Story 3 完成后，命名规则可执行、可观测、可纠偏

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事收尾与最终验收

- [X] T029 [P] 对齐快速开始步骤与真实命令 `specs/001-init-project-modules/quickstart.md`
- [X] T030 校验任务与计划一致性并更新说明 `specs/001-init-project-modules/plan.md`
- [X] T031 执行 quickstart 场景并记录验收结果 `specs/001-init-project-modules/research.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖，可立即开始
- **Phase 2 (Foundational)**: 依赖 Phase 1，且阻塞所有用户故事
- **Phase 3-5 (User Stories)**: 依赖 Phase 2 完成
- **Phase 6 (Polish)**: 依赖所有目标用户故事完成

### User Story Dependencies

- **US1 (P1)**: 仅依赖 Foundational，可最先交付 MVP
- **US2 (P2)**: 依赖 US1 目录已存在与命名稳定
- **US3 (P3)**: 依赖 US1/US2 形成基础结构后执行命名治理

### Parallel Opportunities

- Setup 中 T003、T004 可并行
- Foundational 中 T006、T007 可并行
- US1 中 T012、T013、T015、T016 可并行
- US2 中 T019、T020 可并行
- US3 中 T025、T026 可并行

---

## Parallel Example: User Story 1

```bash
Task: "在后端模块创建基础目录 content-forest-backend/src/.gitkeep"
Task: "在Agent模块创建基础目录 content-forest-agent/mcp/.gitkeep"
Task: "在后端模块补齐仓储与存储目录 content-forest-backend/src/repositories/.gitkeep"
Task: "在Agent模块补齐skills目录 content-forest-agent/skills/.gitkeep"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. 完成 Phase 1 与 Phase 2
2. 完成 US1（Phase 3）
3. 立即按独立验收标准验证三模块目录与命名
4. 通过后作为首个可交付里程碑

### Incremental Delivery

1. 先交付 US1（结构落地）
2. 再交付 US2（独立启动能力）
3. 最后交付 US3（命名治理与纠偏）
4. 每个阶段都保持可单独验收

### Parallel Team Strategy

1. 全员先完成 Setup 与 Foundational
2. 完成后并行推进：
   - 成员 A：US1
   - 成员 B：US2
   - 成员 C：US3
3. 在 Phase 6 统一收敛与验收
