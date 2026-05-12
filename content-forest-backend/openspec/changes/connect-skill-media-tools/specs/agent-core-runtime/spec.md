## ADDED Requirements

### Requirement: Agent Runtime 支持受控 Skill 工具媒体产物
Agent Runtime SHALL 在执行生成器 Skill 时支持受控工具调用，并收集工具产生的媒体候选产物。Agent Runtime MUST 不直接写入正式媒体资源表。

#### Scenario: 收集工具产物
- **WHEN** Skill 工具返回媒体文件、二进制内容或临时资源引用
- **THEN** Agent Runtime MUST 将其登记为候选媒体产物
- **AND** Agent Runtime MUST 将候选产物交给业务层接管

#### Scenario: 禁止直接写系统事实
- **WHEN** Skill 工具生成媒体内容
- **THEN** Agent Runtime MUST NOT 直接写数据库媒体事实
- **AND** Agent Runtime MUST NOT 把本机绝对路径作为正式输出返回给前端
