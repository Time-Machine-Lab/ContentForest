# nutrient-workbench-ui Specification

## Purpose

定义内容森林前端的种子营养工作台入口、三栏式工作区布局、窄屏切换体验以及关闭后返回原工作区上下文的用户行为。

## Requirements

### Requirement: 提供营养工作台入口
前端 SHALL 在种子工作区提供营养工作台入口，并在种子专属营养库页面提供同等入口。入口文案 MUST 让用户理解这是当前种子的营养库与营养汲取工作区。

#### Scenario: 从工作区打开营养工作台
- **WHEN** 用户在种子工作区点击营养库入口
- **THEN** 前端 MUST 打开当前种子的营养工作台 Dialog
- **AND** 工作台 MUST 绑定当前种子

#### Scenario: 从种子专属营养库打开工作台
- **WHEN** 用户在种子专属营养库页面点击营养工作台入口
- **THEN** 前端 MUST 打开同一个种子级营养工作台

### Requirement: 展示三栏式营养工作台
前端 SHALL 以大尺寸悬浮 Dialog 展示营养工作台。桌面端 MUST 展示左侧营养卡片区、中间 Agent 工作区和右侧建议区。

#### Scenario: 桌面端展示三栏
- **WHEN** 用户在桌面视口打开营养工作台
- **THEN** 前端 MUST 展示三栏布局
- **AND** 中间 Agent 工作区 MUST 占据主要宽度

#### Scenario: 窄屏展示 Tab
- **WHEN** 用户在窄屏视口打开营养工作台
- **THEN** 前端 MUST 使用 Tab 或等价导航切换营养卡片、Agent 工作区和建议区

### Requirement: 保持工作区上下文
前端 SHALL 在打开营养工作台时保留工作区画布上下文。Dialog 背景 SHOULD 弱化画布，但 MUST 不触发页面跳转。

#### Scenario: 关闭工作台返回画布
- **WHEN** 用户关闭营养工作台
- **THEN** 前端 MUST 返回原种子工作区画布状态
- **AND** 不应丢失当前工作区浏览位置
