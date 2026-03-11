# Data Model: ContentForest 三模块项目初始化

## Entity: ModuleWorkspace

- Purpose: 表示仓库中的一个顶层模块工作区。
- Fields:
  - `name` (string, required): 模块目录名，必须是 `content-forest-front`、`content-forest-backend`、`content-forest-agent` 之一。
  - `role` (enum, required): `front` | `backend` | `agent`。
  - `path` (string, required): 仓库内绝对或相对规范路径。
  - `status` (enum, required): `missing` | `created` | `existing` | `invalid_name`。
  - `lastVerifiedAt` (datetime, required): 最近一次结构校验时间。
- Validation Rules:
  - `name` 必须唯一且与目标命名完全匹配。
  - 三个 `role` 必须完整覆盖，不允许缺失。
  - 当 `status=invalid_name` 时，必须输出修正建议。

## Entity: StructureRule

- Purpose: 描述三模块初始化的约束规则。
- Fields:
  - `requiredModules` (array<string>, required): 固定为三个目标模块名。
  - `allowExtraTopLevelDirs` (boolean, required): 是否允许存在额外目录。
  - `strictNaming` (boolean, required): 是否要求严格命名匹配。
  - `independentBoundary` (boolean, required): 是否要求模块边界独立。
- Validation Rules:
  - `requiredModules` 长度必须为 3 且内容不可变更。
  - `strictNaming` 必须为 `true`。
  - `independentBoundary` 必须为 `true`。

## Entity: InitializationOutcome

- Purpose: 记录一次初始化执行后的结果。
- Fields:
  - `runId` (string, required): 本次初始化唯一标识。
  - `timestamp` (datetime, required): 执行时间。
  - `modules` (array<ModuleWorkspace>, required): 三模块状态集合。
  - `missingModules` (array<string>, required): 缺失模块名列表。
  - `nameConflicts` (array<string>, required): 非法或冲突命名列表。
  - `result` (enum, required): `success` | `partial_fixed` | `failed`。
  - `actions` (array<string>, required): 本次执行动作说明。
- Validation Rules:
  - `modules` 必须至少包含三个目标模块的状态。
  - `result=success` 时，`missingModules` 与 `nameConflicts` 必须为空。
  - `result=failed` 时，`actions` 必须包含失败原因与下一步建议。

## Relationships

- `StructureRule` 约束 `ModuleWorkspace` 的合法性。
- `InitializationOutcome` 聚合多个 `ModuleWorkspace` 并反映规则校验结果。

## State Transitions

- `ModuleWorkspace.status`:
  - `missing -> created`: 初始化补齐目录后发生。
  - `missing -> existing`: 在执行前已存在目录。
  - `invalid_name -> created`: 修正命名后替换为标准目录。
- `InitializationOutcome.result`:
  - `failed -> partial_fixed`: 部分修正成功但仍有冲突。
  - `partial_fixed -> success`: 再次执行后达成完整结构。
