## ADDED Requirements

### Requirement: 种子可关联当前主简报
系统 SHALL 允许一个种子关联一份当前种子主简报。种子主简报 MUST 是种子的辅助创作地图，MUST 不替代种子 Markdown 正文作为事实源。

#### Scenario: 种子存在主简报
- **WHEN** 种子已生成主简报
- **THEN** 系统 MUST 能通过种子身份定位当前主简报
- **AND** 系统 MUST 保持种子 Markdown 正文不变

#### Scenario: 种子不存在主简报
- **WHEN** 种子尚未生成主简报
- **THEN** 系统 MUST 允许种子详情、工作区和枝化生长继续使用种子正文
- **AND** 系统 MUST 不要求用户先生成主简报
