## ADDED Requirements

### Requirement: 工作区集成种子主简报面板
前端 SHALL 将种子主简报集成到种子工作区中。主简报面板 MUST 遵循 Quiet Command Workspace 风格，MUST 不遮挡内容树主要交互和底部枝化生长输入框。

#### Scenario: 打开主简报面板
- **WHEN** 用户在工作区点击主简报入口
- **THEN** 前端 MUST 打开轻量侧栏、抽屉或辅助面板展示主简报
- **AND** 内容树拖拽、节点点击和枝化生长输入框 MUST 保持可用

#### Scenario: 折叠主简报面板
- **WHEN** 用户折叠或关闭主简报面板
- **THEN** 前端 MUST 回到内容树优先的工作区布局
- **AND** 前端 MUST 不丢失当前选中节点和输入框内容
