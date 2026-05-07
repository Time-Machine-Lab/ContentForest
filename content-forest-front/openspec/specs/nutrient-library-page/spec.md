# nutrient-library-page Specification

## Purpose

定义内容森林前端营养库页面的知识库式资料维护体验，包括公共/种子专属营养库视图、营养库创建编辑、Markdown 营养内容管理、归档回档、可引用营养查询和接口联动行为。

## Requirements

### Requirement: 营养库页面入口
前端 SHALL 在工作台中提供 `/nutrients` 营养库管理页面。该页面 MUST 遵循 `docs/spec/DESIGN.md` 的暗色紧凑工作台风格，并 MUST 通过 `docs/api/nutrient.yaml` 中定义的接口读取和维护营养库数据。

#### Scenario: 打开营养库页面
- **WHEN** 用户点击工作台中的营养库入口
- **THEN** 前端 MUST 展示营养库管理页面
- **AND** 页面 MUST 提供公共营养库和种子专属营养库的查看入口
- **AND** 页面 MUST NOT 展示向量检索、知识库问答、网页采集或基因库管理能力

### Requirement: 查看营养库列表
前端 SHALL 支持查看公共营养库和种子专属营养库列表。列表数据 MUST 来自 `docs/api/nutrient.yaml` 对应接口，展示字段 MUST 与该接口响应和 `docs/sql/nutrient.sql` 的系统事实边界一致。

#### Scenario: 查看公共营养库
- **WHEN** 用户切换到公共营养库视图
- **THEN** 前端 MUST 请求公共营养库列表
- **AND** 前端 MUST 展示营养库名称、可选描述和归档状态
- **AND** 前端 MUST NOT 要求公共营养库绑定种子

#### Scenario: 查看种子专属营养库
- **WHEN** 用户切换到种子专属营养库视图
- **THEN** 前端 MUST 请求种子专属营养库列表
- **AND** 前端 MUST 展示营养库名称、可选描述、归属种子和归档状态

#### Scenario: 查看已归档营养库
- **WHEN** 用户切换到已归档视图或筛选已归档状态
- **THEN** 前端 MUST 展示已归档营养库
- **AND** 已归档营养库 MUST 保持可查看
- **AND** 已归档营养库 MUST 在视觉上表达不可被新的枝化生长引用

### Requirement: 创建营养库
前端 SHALL 支持创建公共营养库和种子专属营养库。名称 MUST 在提交前校验为非空，描述 MUST 允许为空；种子专属营养库 MUST 要求用户选择归属种子。

#### Scenario: 创建公共营养库
- **WHEN** 用户选择公共作用域并提交名称和可选描述
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的创建营养库接口
- **AND** 请求 MUST 表达公共作用域
- **AND** 请求 MUST NOT 携带归属种子作为必填条件

#### Scenario: 创建种子专属营养库
- **WHEN** 用户选择种子专属作用域并提交名称、可选描述和归属种子
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的创建营养库接口
- **AND** 请求 MUST 表达种子专属作用域
- **AND** 请求 MUST 携带用户选择的归属种子

#### Scenario: 创建表单校验失败
- **WHEN** 用户提交空名称或种子专属作用域缺少归属种子
- **THEN** 前端 MUST 阻止提交
- **AND** 前端 MUST 保留用户已输入内容

### Requirement: 编辑营养库名称和描述
前端 SHALL 支持编辑营养库名称和描述。编辑表单 MUST NOT 提供修改作用域或改绑归属种子的入口。

#### Scenario: 编辑营养库基本信息
- **WHEN** 用户在营养库详情中修改名称或描述并保存
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的编辑营养库接口
- **AND** 请求 MUST 只包含允许编辑的名称和描述
- **AND** 前端 MUST NOT 修改营养库作用域或归属种子

#### Scenario: 编辑失败
- **WHEN** 编辑营养库请求失败
- **THEN** 前端 MUST 展示局部失败反馈
- **AND** 前端 MUST 保留用户未保存输入
- **AND** 前端 MUST NOT 污染当前已加载详情状态

### Requirement: 归档和回档营养库
前端 SHALL 支持归档和回档营养库。营养库不得被硬删除；归档后仍可查看，但不得作为新枝化生长引用候选。

#### Scenario: 归档营养库
- **WHEN** 用户对未归档营养库执行归档
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的归档营养库接口
- **AND** 成功后前端 MUST 更新列表和详情中的归档状态
- **AND** 前端 MUST NOT 提供删除营养库操作

#### Scenario: 回档营养库
- **WHEN** 用户对已归档营养库执行回档
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的回档营养库接口
- **AND** 成功后前端 MUST 将该营养库恢复为可用展示状态

### Requirement: 管理营养内容
前端 SHALL 支持在营养库下新增、查看、编辑、归档和回档营养内容。营养内容正文 MUST 使用 Markdown 文本手写或复制粘贴，MUST NOT 在第一期提供文件上传或网页导入入口。

#### Scenario: 新增 Markdown 营养内容
- **WHEN** 用户在未归档营养库下提交营养内容标题和 Markdown 正文
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的新增营养内容接口
- **AND** 前端 MUST 在成功后刷新当前营养库内容列表或插入新内容
- **AND** 前端 MUST NOT 上传文件或提交附件解析任务

#### Scenario: 查看营养内容详情
- **WHEN** 用户点击营养内容
- **THEN** 前端 MUST 请求营养内容详情
- **AND** 前端 MUST 使用统一 Markdown 渲染组件展示正文
- **AND** 前端 MUST 展示营养内容归档状态

#### Scenario: 编辑营养内容
- **WHEN** 用户编辑营养内容标题或 Markdown 正文并保存
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的编辑营养内容接口
- **AND** 请求 MUST NOT 修改营养内容所属营养库
- **AND** 保存失败时前端 MUST 保留未保存输入

#### Scenario: 归档和回档营养内容
- **WHEN** 用户归档或回档营养内容
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中对应接口
- **AND** 成功后前端 MUST 更新当前营养内容和所属营养库内容列表状态
- **AND** 前端 MUST NOT 提供硬删除营养内容操作

### Requirement: 归档状态下的操作边界
前端 SHALL 在已归档营养库或已归档营养内容上限制新增和编辑操作。已归档资源 MUST 允许查看和回档。

#### Scenario: 已归档营养库详情
- **WHEN** 用户查看已归档营养库
- **THEN** 前端 MUST 展示该营养库详情
- **AND** 前端 MUST 禁止在该库下新增营养内容
- **AND** 前端 MUST 提供回档操作

#### Scenario: 已归档营养内容详情
- **WHEN** 用户查看已归档营养内容
- **THEN** 前端 MUST 展示该营养内容详情
- **AND** 前端 MUST 表达该内容不可被新的枝化生长引用
- **AND** 前端 MUST 提供回档操作

### Requirement: 可引用营养数据访问
前端 SHALL 提供按种子查询可引用营养内容的数据访问封装，用于后续工作区 `@营养` 引用。该封装 MUST 调用 `docs/api/nutrient.yaml` 中的可引用营养查询接口，MUST NOT 在组件内自行拼接作用域过滤规则。

#### Scenario: 查询某个种子的可引用营养
- **WHEN** 工作区或资源选择组件请求某个种子的可引用营养内容
- **THEN** 前端 MUST 调用可引用营养查询接口
- **AND** 返回结果 MUST 只作为引用候选使用
- **AND** 前端 MUST NOT 将营养库管理列表直接当作引用候选结果

### Requirement: 页面状态反馈
前端 SHALL 为营养库页面提供加载、空状态、失败、提交中和操作失败反馈。失败反馈 MUST 是局部的，并 MUST 保留用户输入。

#### Scenario: 列表加载失败
- **WHEN** 营养库列表请求失败
- **THEN** 前端 MUST 展示列表区域失败反馈
- **AND** 前端 MUST 提供重试入口

#### Scenario: 创建或编辑请求进行中
- **WHEN** 用户提交创建或编辑请求
- **THEN** 前端 MUST 禁用当前提交按钮
- **AND** 前端 MUST 保持页面其他可浏览区域不被全局阻塞

#### Scenario: 空状态展示
- **WHEN** 当前视图没有营养库或营养内容
- **THEN** 前端 MUST 展示紧凑空状态
- **AND** 前端 MUST 提供与当前视图匹配的创建入口
