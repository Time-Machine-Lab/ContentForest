## ADDED Requirements

### Requirement: 营养内容必须作为资产入口展示
前端 SHALL 将营养内容卡片作为沉淀资产入口。点击营养内容 MUST 展示内容详情和资产操作，不得自动进入或创建研究会话。

#### Scenario: 点击营养内容资产
- **WHEN** 用户点击营养内容栏中的卡片
- **THEN** 主工作区 MUST 展示该营养内容详情
- **AND** 主工作区 MUST 展示该营养内容可用的状态操作
- **AND** 前端 MUST NOT 自动调用研究会话详情接口

#### Scenario: 查看营养内容详情
- **WHEN** 营养内容详情加载成功
- **THEN** 前端 MUST 使用 Markdown 阅读视图展示正文
- **AND** 前端 MUST 展示状态、更新时间、默认带入状态和可用操作

### Requirement: 营养内容删除必须按状态受控
前端 SHALL 在后端支持时提供营养内容删除入口。删除入口 MUST 根据营养内容状态和后端契约决定是否可用。

#### Scenario: 删除可删除营养内容
- **WHEN** 当前营养内容状态允许删除且后端已提供删除接口
- **THEN** 前端 MUST 展示危险态删除按钮
- **AND** 用户确认后 MUST 调用 `docs/api/nutrient.yaml` 定义的删除接口
- **AND** 删除成功后 MUST 从营养内容栏移除该内容

#### Scenario: 删除能力未被支持
- **WHEN** 当前营养内容状态不允许删除或后端接口未定义
- **THEN** 前端 MUST 隐藏或禁用删除入口
- **AND** 禁用态 MUST 用文案说明原因
