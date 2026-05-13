# nutrient-card-lifecycle-ui Specification

## Purpose

定义内容森林前端营养内容生命周期操作体验，包括不同状态列表展示、内容查看、沉淀归档、临时引用和默认带入交互。

## Requirements

### Requirement: 展示营养卡片列表
前端 SHALL 在营养工作台左侧展示当前种子的营养卡片列表。卡片 MUST 显示标题、状态、更新时间和主要操作入口。

#### Scenario: 展示不同状态卡片
- **WHEN** 营养工作台加载当前种子的营养卡片
- **THEN** 前端 MUST 区分展示未沉淀、已沉淀和已归档卡片
- **AND** 已归档卡片 MUST 弱化展示

### Requirement: 查看营养卡片内容
前端 SHALL 支持用户查看营养卡片正文内容。查看内容 MUST 不影响卡片状态。

#### Scenario: 打开卡片内容
- **WHEN** 用户点击查看内容按钮
- **THEN** 前端 MUST 展示该营养卡片的 Markdown 正文

### Requirement: 支持卡片状态操作
前端 SHALL 为营养卡片提供状态操作。未沉淀卡片 MUST 可以沉淀或归档；已沉淀卡片 MUST 可以归档；已归档卡片 MUST 可以回档。

#### Scenario: 沉淀未沉淀卡片
- **WHEN** 用户点击未沉淀卡片的沉淀操作
- **THEN** 前端 MUST 调用后端沉淀接口
- **AND** 成功后卡片状态 MUST 更新为已沉淀

#### Scenario: 归档卡片
- **WHEN** 用户归档营养卡片
- **THEN** 前端 MUST 调用后端归档接口
- **AND** 成功后卡片 MUST 标记为已归档

### Requirement: 支持引用和常驻营养
前端 SHALL 支持未沉淀卡片临时引用、已沉淀卡片正式引用和已沉淀卡片常驻营养设置。

#### Scenario: 临时引用未沉淀卡片
- **WHEN** 用户选择临时引用未沉淀卡片
- **THEN** 前端 MUST 将该卡片加入本次枝化生长的临时营养引用

#### Scenario: 设置常驻营养
- **WHEN** 用户打开已沉淀卡片的常驻营养开关
- **THEN** 前端 MUST 调用后端更新 `defaultForGrowth` 的接口
- **AND** 后续枝化生长输入框 MUST 默认带入该营养

#### Scenario: 移除默认带入
- **WHEN** 常驻营养出现在枝化生长输入框引用区
- **THEN** 用户 MUST 可以移除该引用
- **AND** 该移除只影响本次输入，不自动关闭常驻营养设置
