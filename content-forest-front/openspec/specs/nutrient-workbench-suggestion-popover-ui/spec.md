# nutrient-workbench-suggestion-popover-ui Specification

## Purpose
TBD - created by archiving change redesign-nutrient-workbench-session-card-ui. Update Purpose after archive.
## Requirements
### Requirement: 汲取建议必须通过消息入口展示
营养工作台 SHALL 将营养汲取建议收纳到主工作区 header 的消息按钮中。消息按钮 MUST 展示未处理建议数量。

#### Scenario: 展示建议数量
- **WHEN** 营养工作台加载未处理汲取建议
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的汲取建议列表接口
- **AND** 主工作区 header MUST 显示消息按钮
- **AND** 消息按钮 MUST 展示未处理建议数量

#### Scenario: 打开建议浮层
- **WHEN** 用户点击消息按钮
- **THEN** 前端 MUST 展示悬浮建议面板
- **AND** 面板 MUST 展示建议标题、来源、摘要、采纳和忽略操作
- **AND** 面板 MUST 不遮挡主输入框的核心操作

### Requirement: 采纳建议必须进入新会话草稿
营养工作台 SHALL 在用户采纳汲取建议后进入新会话草稿态，并将建议内容填入输入框。

#### Scenario: 采纳汲取建议
- **WHEN** 用户点击某条汲取建议的采纳按钮
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的采纳建议接口
- **AND** 主工作区 MUST 切换为新会话草稿态
- **AND** 输入框 MUST 填入该建议的研究内容
- **AND** 前端 MUST 等待用户发送后才创建研究会话

#### Scenario: 忽略汲取建议
- **WHEN** 用户点击某条汲取建议的忽略按钮
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的忽略建议接口
- **AND** 成功后 MUST 从建议浮层移除该建议

