## ADDED Requirements

### Requirement: 工作台必须提供独立营养内容栏
营养工作台 SHALL 在右侧展示当前种子的营养内容资产。营养内容栏 MUST 只表达资产浏览、筛选和状态操作，不作为会话入口。

#### Scenario: 打开营养内容栏
- **WHEN** 用户打开营养工作台
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的当前种子营养内容列表接口
- **AND** 右侧栏 MUST 展示营养内容卡片列表
- **AND** 每张卡片 MUST 展示状态、标题、更新时间或默认带入标记

#### Scenario: 点击营养内容卡片
- **WHEN** 用户点击右侧营养内容卡片
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 定义的营养内容详情接口
- **AND** 主工作区 MUST 切换为营养内容详情模式
- **AND** 前端 MUST NOT 因点击营养内容而自动加载或创建研究会话

### Requirement: 营养内容栏必须支持本地搜索和状态筛选
营养内容栏 SHALL 提供轻量搜索和状态筛选。第一版搜索和筛选 MUST 在前端本地完成，不新增后端查询要求。

#### Scenario: 搜索营养内容
- **WHEN** 用户在营养内容栏输入搜索词
- **THEN** 前端 MUST 基于已加载营养内容的标题和摘要进行本地过滤
- **AND** 搜索结果 MUST 即时更新

#### Scenario: 按状态筛选营养内容
- **WHEN** 用户选择草稿、正常或归档筛选项
- **THEN** 前端 MUST 只展示匹配状态的营养内容
- **AND** 用户 MUST 可以恢复查看全部状态

### Requirement: 营养内容操作必须按状态展示
营养内容栏 SHALL 根据营养内容状态展示可执行操作。按钮 MUST 有明确状态、危险级别和禁用反馈。

#### Scenario: 操作草稿营养内容
- **WHEN** 营养内容状态为草稿
- **THEN** 前端 MUST 展示沉淀操作
- **AND** 前端 MAY 在后端支持时展示删除操作

#### Scenario: 操作正常营养内容
- **WHEN** 营养内容状态为正常
- **THEN** 前端 MUST 展示归档操作
- **AND** 前端 MUST 展示默认带入相关操作

#### Scenario: 操作归档营养内容
- **WHEN** 营养内容状态为归档
- **THEN** 前端 MUST 弱化展示该卡片
- **AND** 前端 MUST 只展示后端已支持的恢复或删除能力
