## ADDED Requirements

### Requirement: 收集 Skill 工具媒体产物
系统 SHALL 允许 Agent Runtime 在执行生成器 Skill 时收集工具产出的媒体产物。媒体产物在接管前 MUST 只是候选产物，MUST 不直接成为系统事实。

#### Scenario: Skill 工具生成图片
- **WHEN** 生成器 Skill 调用工具生成图片
- **THEN** Agent Runtime MUST 收集该图片候选产物
- **AND** 系统 MUST 不直接把工具本地路径暴露给前端或数据库

#### Scenario: Skill 工具生成视频
- **WHEN** 生成器 Skill 调用工具生成视频
- **THEN** Agent Runtime MUST 收集该视频候选产物
- **AND** 系统 MUST 在正式接管前执行媒体校验

### Requirement: 接管媒体产物为 Media Asset
系统 SHALL 在枝化生长结果封装阶段将候选媒体产物交给 Media Asset 能力保存。只有成功保存的媒体资源 MAY 挂载到果实。

#### Scenario: 成功接管媒体产物
- **WHEN** 候选媒体产物通过校验并保存成功
- **THEN** 系统 MUST 创建 Media Asset
- **AND** 系统 MUST 允许该 Media Asset 挂载到候选果实

#### Scenario: 媒体产物接管失败
- **WHEN** 候选媒体产物无法通过校验或保存失败
- **THEN** 系统 MUST 记录可排查 warning 或失败原因
- **AND** 系统 MUST 不创建指向无效内容位置的媒体资源

### Requirement: 不限制生成器媒体能力
系统 SHALL 不要求生成器声明是否支持图片或视频生成。生成器媒体能力由 Skill 本身和其可用工具决定。

#### Scenario: 纯文本生成器
- **WHEN** 生成器 Skill 只产出 Markdown 内容
- **THEN** 系统 MUST 正常封装文本果实
- **AND** 系统 MUST 不要求该生成器提供媒体产物

#### Scenario: 多媒体生成器
- **WHEN** 生成器 Skill 通过工具产出媒体内容
- **THEN** 系统 MUST 尝试接管这些媒体产物
- **AND** 成功接管的媒体资源 MUST 能随果实候选交付果实领域
