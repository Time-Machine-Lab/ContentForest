# Contract: Module Initialization

## 1. Contract Purpose

定义“三模块初始化”对调用方可见的输入与输出约束，用于保证结构创建、校验与修正行为一致。

## 2. Input Contract

### Command

- `initialize-modules`

### Request Payload

```json
{
  "requiredModules": [
    "content-forest-front",
    "content-forest-backend",
    "content-forest-agent"
  ],
  "strictNaming": true,
  "dryRun": false
}
```

### Input Rules

- `requiredModules` 必须包含且仅包含 3 个目标模块名。
- `strictNaming` 必须为 `true`。
- `dryRun=true` 时仅返回校验与计划动作，不落地创建。

## 3. Output Contract

### Success Response

```json
{
  "result": "success",
  "modules": [
    { "name": "content-forest-front", "status": "existing" },
    { "name": "content-forest-backend", "status": "created" },
    { "name": "content-forest-agent", "status": "created" }
  ],
  "missingModules": [],
  "nameConflicts": [],
  "actions": [
    "created content-forest-backend",
    "created content-forest-agent"
  ]
}
```

### Stable Success Response (Idempotent)

```json
{
  "result": "success",
  "modules": [
    { "name": "content-forest-front", "status": "existing" },
    { "name": "content-forest-backend", "status": "existing" },
    { "name": "content-forest-agent", "status": "existing" }
  ],
  "missingModules": [],
  "nameConflicts": [],
  "actions": []
}
```

### Partial Response

```json
{
  "result": "partial_fixed",
  "modules": [
    { "name": "content-forest-front", "status": "existing" },
    { "name": "content-forest-backend", "status": "existing" },
    { "name": "content-forest-agent", "status": "missing" }
  ],
  "missingModules": ["content-forest-agent"],
  "nameConflicts": ["content-forest-agents"],
  "actions": ["detected conflict: content-forest-agents"]
}
```

### Error Response

```json
{
  "result": "failed",
  "errorCode": "INVALID_MODULE_SET",
  "message": "requiredModules must exactly match the three standard module names"
}
```

## 4. Behavioral Guarantees

- 初始化流程必须幂等：重复执行不会破坏既有合法目录。
- 任何结果都必须返回可执行动作信息，便于人工复核。
- 不允许隐式重命名未知目录；发现冲突时必须显式报告。
