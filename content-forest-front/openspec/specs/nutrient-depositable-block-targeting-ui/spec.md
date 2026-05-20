# nutrient-depositable-block-targeting-ui Specification

## Purpose
TBD - created by archiving change redesign-nutrient-workbench-session-card-ui. Update Purpose after archive.
## Requirements
### Requirement: 可沉淀营养块必须显式选择保存方式
营养工作台 SHALL 将 Agent 产出的可沉淀营养块展示为成果卡。成果卡 MUST 提供保存为新草稿和选择目标合并两类明确操作。

#### Scenario: 展示可沉淀营养块
- **WHEN** 前端收到营养研究 SSE 中的可沉淀营养块事件
- **THEN** 主工作区 MUST 以成果卡展示该营养块
- **AND** 成果卡 MUST 展示标题、正文预览和操作按钮

#### Scenario: 保存为新草稿
- **WHEN** 用户点击保存为新草稿
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的创建营养内容接口
- **AND** 新建成功后右侧营养内容栏 MUST 刷新或插入新卡片

### Requirement: 合并营养块必须选择目标营养内容
营养工作台 SHALL 在合并可沉淀营养块前要求用户选择目标营养内容。前端 MUST NOT 使用“当前选中内容”作为隐式合并目标。

#### Scenario: 打开合并目标选择器
- **WHEN** 用户点击可沉淀营养块的选择合并目标按钮
- **THEN** 前端 MUST 展示目标营养内容选择器
- **AND** 选择器 MUST 支持按标题搜索和按状态过滤可合并目标

#### Scenario: 合并到指定营养内容
- **WHEN** 用户选择目标营养内容并确认合并
- **THEN** 前端 MUST 调用后端支持的营养内容更新或合并接口
- **AND** 成功后 MUST 刷新目标营养内容详情和右侧营养内容栏
- **AND** 成果卡 MUST 标记为已处理或从待处理列表移除

#### Scenario: 后端尚未提供目标合并契约
- **WHEN** `docs/api/nutrient.yaml` 尚未定义可沉淀营养块合并到指定营养内容的契约
- **THEN** 前端任务 MUST 标记为 `【依赖后端更新】`
- **AND** 前端 MUST 不继续使用“合并到当前内容”的隐式文案

