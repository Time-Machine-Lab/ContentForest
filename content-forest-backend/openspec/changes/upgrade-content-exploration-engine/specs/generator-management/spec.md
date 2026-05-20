## ADDED Requirements

### Requirement: 生成器可作为平台与方法论推断来源
系统 SHALL 允许枝化生长在授权范围内读取已选择生成器的名称、描述和 Skill 本体，用于推断平台、内容形态和创作方法论。该推断属于枝化生长策略语义，MUST NOT 改变生成器领域的职责边界。

#### Scenario: 枝化生长读取生成器线索
- **WHEN** 枝化生长领域选择一个启用生成器并执行内容探索
- **THEN** 系统 MUST 允许枝化生长通过既有内容访问和 Agent Tool 边界读取生成器名称、描述和 Skill 本体
- **AND** 这些信息 MAY 被内容进化策略用于平台和方法论推断

#### Scenario: 生成器领域不承担探索规则
- **WHEN** 内容进化策略根据生成器线索推断平台或内容形态
- **THEN** 生成器领域 MUST NOT 负责生成探索路线、判断生长策略或封装果实
- **AND** 推断结果 MUST 归属于枝化生长或 Agent 策略上下文

### Requirement: 不强制生成器提供专用平台 manifest
系统 SHALL 保持生成器 Skill 的外部独立性。平台和内容形态推断 MUST 能基于生成器名称、描述和 Skill 正文完成，MUST NOT 要求生成器包含 ContentForest 专用 manifest、`generator.json` 或结构化平台字段。

#### Scenario: 没有 manifest 的生成器仍可推断
- **WHEN** 用户上传的生成器 Skill 包含 `SKILL.md` 但不包含专用 manifest
- **THEN** 系统 MUST 继续允许该生成器导入和被枝化生长选择
- **AND** 内容进化策略 MAY 从名称、描述和 `SKILL.md` 自然语言中推断平台线索

#### Scenario: 推断失败不阻塞生成器使用
- **WHEN** 系统无法从生成器信息中推断明确平台或内容形态
- **THEN** 枝化生长 MUST 继续按用户要求或系统上下文推断执行
- **AND** 生成器管理能力 MUST 不因此把生成器标记为非法

### Requirement: 生成器线索不得成为不可验证系统事实
系统 SHALL 将从生成器中提取的平台、形态或方法论线索视为本轮策略线索，而不是生成器领域系统事实。除非后续有独立契约明确要求，系统 MUST NOT 因一次生长推断而写入新的生成器平台字段。

#### Scenario: 推断结果仅进入生长上下文
- **WHEN** 枝化生长根据生成器推断出平台或内容形态
- **THEN** 系统 MUST 将推断结果保存在生长任务上下文、路线元数据、Trace 或日志中
- **AND** 系统 MUST NOT 自动修改生成器表或生成器 Skill 本体

#### Scenario: 历史追溯不依赖推断写回
- **WHEN** 用户查看历史生长任务或历史果实
- **THEN** 系统 MUST 通过生长任务或 attempt 的路线元数据追溯当时的平台推断
- **AND** 系统 MUST NOT 依赖生成器当前推断结果重写历史解释
