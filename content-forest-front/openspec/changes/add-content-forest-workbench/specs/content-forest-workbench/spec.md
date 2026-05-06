## ADDED Requirements

### Requirement: 主工作台外壳
前端 SHALL 提供内容森林主工作台外壳，用于承载种子库、生成器、营养库和后续工作区页面。该外壳 MUST 遵循 `DESIGN.md` 定义的暗色、紧凑、命令式工作台风格。

#### Scenario: 打开主工作台
- **WHEN** 用户进入内容森林前端应用
- **THEN** 前端 MUST 展示主工作台外壳
- **AND** 前端 MUST 将种子库作为第一期默认可用入口

#### Scenario: 保持工作台视觉一致
- **WHEN** 前端展示主工作台外壳内的页面
- **THEN** 页面 MUST 使用统一的暗色工作台背景、紧凑导航、顶部命令区域和内容承载布局
- **AND** 页面 MUST 不使用营销站 Hero 或传统后台大表格作为主视觉

### Requirement: 全局导航边界
前端 SHALL 在左侧全局导航中展示主工作台级入口。已归档种子 MUST NOT 作为左侧全局导航项出现，归档筛选 MUST 归属于种子库页面内部。

#### Scenario: 查看左侧导航
- **WHEN** 用户查看左侧全局导航
- **THEN** 前端 MUST 展示种子库、生成器、营养库等主工作台级入口
- **AND** 前端 MUST NOT 在左侧全局导航中展示已归档种子入口

#### Scenario: 进入种子库归档视图
- **WHEN** 用户需要查看已归档种子
- **THEN** 前端 MUST 在种子库页面内部提供已归档视图入口

### Requirement: 页面级命令入口
前端 SHALL 在主工作台顶部提供页面级命令入口，用于承载当前页面的主要操作和后续命令面板能力。本次种子库页面中，该入口 MUST 能触发新建种子的 Command Modal。

#### Scenario: 在种子库触发命令入口
- **WHEN** 用户在种子库页面点击顶部命令入口
- **THEN** 前端 MUST 打开新建种子的 Command Modal

#### Scenario: 页面主要操作可见
- **WHEN** 用户进入种子库页面
- **THEN** 前端 MUST 在顶部区域提供新建种子的主要操作入口
