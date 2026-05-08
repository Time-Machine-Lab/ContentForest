## Why

枝化生长在真实 LLM 环境中会因为候选果实结构化输出中的 `usedResourceRefs` 格式不稳定而反复失败，例如模型返回字符串数组时会触发 `resource ref must be an object`。同时当前修复提示没有把真实校验错误传给模型，导致自动修复无法针对错误收敛。

## What Changes

- 修复候选果实结构化输出 repair prompt，使校验错误真实传入修复模型。
- 强化候选果实结构化输出提示，明确 `usedResourceRefs` 的对象数组格式，并给出可执行 JSON 示例。
- 增强 `usedResourceRefs` 归一化能力：在安全授权范围内兼容模型返回的字符串引用，避免可自动纠正的格式问题导致整次枝化生长失败。
- 保持授权边界不变：未授权或无法识别的资源引用不得被悄悄接受为已使用资源。
- 增加测试覆盖字符串资源引用、修复提示错误传递、非法引用失败等场景。
- 不变更 API 和数据库结构。

## Capabilities

### New Capabilities

### Modified Capabilities
- `branch-growth-agent-skill`: 修正候选果实结构化输出、资源引用归一化和自检修复行为，提升真实 LLM 输出下的枝化生长成功率。

## Impact

- Affected backend modules: branch growth Agent skill structured output builder, candidate fruit validator/normalizer, and related tests.
- Affected integration boundary: `BranchGrowthSkill -> buildStructuredBranchGrowthCandidate -> validateBranchGrowthCandidateFruit -> GrowthService`.
- No API document change is required because endpoint contracts do not change.
- No SQL document change is required because storage structures do not change.
- No new external dependency is required.
