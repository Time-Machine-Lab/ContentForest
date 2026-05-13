## Purpose

Defines backend support for discovering, storing, listing, accepting, and ignoring seed-level nutrient acquisition suggestions that help users close lightweight content research gaps.

## Requirements

### Requirement: 维护营养汲取建议
系统 SHALL 支持种子级营养汲取建议。建议 MUST 具有待处理、已采纳、已忽略状态，并 MUST 归属于明确种子。

#### Scenario: 创建待处理建议
- **WHEN** 系统发现当前种子存在营养缺口
- **THEN** 系统 MUST 创建待处理营养汲取建议
- **AND** 建议 MUST 归属于当前种子

#### Scenario: 查询待处理建议
- **WHEN** 工作区或营养工作台请求当前种子的建议列表
- **THEN** 系统 MUST 返回该种子下待处理建议
- **AND** 系统 MUST NOT 返回已忽略建议

### Requirement: 基于轻量信号发现营养缺口
系统 SHALL 能基于种子主简报、枝化生长前检查、用户输入、果实淘汰和生成反馈等轻量信号形成营养缺口建议。

#### Scenario: 从种子主简报证据缺口生成建议
- **WHEN** 种子主简报包含证据缺口或资料缺口
- **THEN** 系统 SHOULD 能创建对应营养汲取建议

#### Scenario: 从生长输入平台方向生成建议
- **WHEN** 用户在枝化生长输入中提到某个平台或内容方向但当前种子缺少相关营养
- **THEN** 系统 SHOULD 能创建对应营养汲取建议

#### Scenario: 从淘汰果实生成建议
- **WHEN** 果实被淘汰且淘汰原因体现资料不足、平台语感不足或案例不足
- **THEN** 系统 SHOULD 能创建对应营养汲取建议

### Requirement: 采纳或忽略营养汲取建议
系统 SHALL 支持用户采纳或忽略营养汲取建议。采纳建议 MUST 创建未沉淀营养卡片；忽略建议 MUST 不再展示。

#### Scenario: 采纳建议
- **WHEN** 用户采纳一条待处理营养汲取建议
- **THEN** 系统 MUST 将建议标记为已采纳
- **AND** 系统 MUST 创建一张未沉淀营养卡片
- **AND** 系统 MUST 将建议内容作为该卡片的初始研究输入

#### Scenario: 忽略建议
- **WHEN** 用户忽略一条待处理营养汲取建议
- **THEN** 系统 MUST 将建议标记为已忽略
- **AND** 系统 MUST NOT 创建营养卡片
