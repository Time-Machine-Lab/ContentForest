## ADDED Requirements

### Requirement: 突变以搜索半径表达
系统 SHALL 将突变激进程度理解为内容搜索半径。突变目标 MUST 是在不偏离种子核心的前提下探索新的有效表达路线，而不是追求越新越好。

#### Scenario: 保守突变
- **WHEN** 系统使用保守突变
- **THEN** 系统 MUST 优先继承父节点方向和已验证成功基因
- **AND** 系统 SHOULD 只改变少量表达变量

#### Scenario: 均衡突变
- **WHEN** 系统使用均衡突变
- **THEN** 系统 MUST 保留种子核心和有效基因
- **AND** 系统 MAY 引入新的角度、结构或受众假设

#### Scenario: 激进突变
- **WHEN** 系统使用激进突变
- **THEN** 系统 MAY 从主简报、营养库、基因库和 Agent 联想中探索更远方向
- **AND** 系统 MUST 不违背种子事实和用户明确约束

### Requirement: 系统推荐默认搜索策略
系统 SHALL 在用户未明确选择搜索模式或突变激进程度时推荐默认值。

#### Scenario: 冷启动推荐
- **WHEN** 种子首次或缺少反馈时发起枝化生长
- **THEN** 系统 SHOULD 推荐广泛探索和均衡或激进突变

#### Scenario: 基于已选择果实继续生长
- **WHEN** 用户从已选择果实继续生长
- **THEN** 系统 SHOULD 推荐方向强化或局部变异
- **AND** 系统 SHOULD 推荐保守或均衡突变

#### Scenario: 基于负反馈重新探索
- **WHEN** 当前上下文存在明确淘汰或失败反馈
- **THEN** 系统 SHOULD 推荐负反馈规避或广泛探索
- **AND** 系统 MAY 推荐更激进的突变
