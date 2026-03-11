# Phase 0 Research: ContentForest 三模块项目初始化

## Decision 1: 采用三顶层模块命名作为唯一标准

- Decision: 使用 `content-forest-front`、`content-forest-backend`、`content-forest-agent` 作为唯一合法顶层目录名。
- Rationale: 该命名已由需求明确指定，且能直接映射前端、后端、Agent 三类职责，降低协作沟通成本。
- Alternatives considered:
  - 使用 `frontend/backend/agent`: 与当前特性输入不一致，放弃。
  - 使用 `apps/*` 命名: 需要额外映射规则，短期无增益，放弃。

## Decision 2: 统一技术栈对齐宪法 1.7

- Decision: 前后端统一 TypeScript，前端采用 Nuxt，后端保留 Node.js + TypeScript，Agent 通过 MCP 集成。
- Rationale: 宪法与项目 README 明确给出统一栈约束，统一语言降低上下游接口与模型转换成本。
- Alternatives considered:
  - 前端使用 React、后端使用其他语言: 破坏统一栈原则，放弃。
  - Agent 直接操作文件: 违反协议驱动与架构解耦原则，放弃。

## Decision 3: 初始化结果需要可验证输出

- Decision: 初始化过程必须给出结构验证结果，至少覆盖“目录是否存在、命名是否一致、是否有缺失项”。
- Rationale: 满足 FR-006，保证团队可以快速确认初始化是否达标，减少人工反复检查。
- Alternatives considered:
  - 仅创建目录不输出结果: 可观测性不足，放弃。
  - 依赖人工目测目录树: 不稳定且不可标准化，放弃。

## Decision 4: 约束模块边界并保留 SaaS 就绪前提

- Decision: 模块职责按前端/后端/Agent 分层，后端侧所有数据访问设计时保留 userId 上下文要求。
- Rationale: 满足宪法 1.3 与 1.6，避免未来从本地 MVP 演进至 SaaS 时大规模重构。
- Alternatives considered:
  - 在初始化阶段允许混合职责目录: 会引入长期耦合，放弃。
  - 暂不考虑 userId 隔离: 未来迁移成本高，放弃。

## Decision 5: 采用单仓多模块协作模型

- Decision: 三模块同仓维护，保持统一规范流程（spec/plan/tasks）与质量门禁。
- Rationale: 当前项目体量与团队协作阶段更适合单仓治理，便于集中演进架构与复用工具链。
- Alternatives considered:
  - 三仓拆分: 运维与治理成本更高，当前阶段不必要，放弃。
  - 单体目录不拆模块: 不利于职责边界与并行开发，放弃。

## Quickstart Validation Record

- Executed: `./scripts/initialize-modules.sh --dry-run`
- Output: `result=success`, `missingModules=[]`, `nameConflicts=[]`
- Executed: `./scripts/initialize-modules.sh --apply`
- Output: `result=success`, 三模块状态均为 `existing`
- Conclusion: 初始化流程满足幂等性与可验证输出要求，可作为后续模块开发入口。
