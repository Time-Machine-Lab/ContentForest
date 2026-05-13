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

### Requirement: 营养库页面入口必须打开优化后的营养工作台
营养库页面中的种子专属营养库入口 MUST 打开与种子工作区一致的营养工作台体验，不得跳转到独立研究页面。

#### Scenario: 从种子专属营养库进入工作台
- **WHEN** 用户在营养库页面选择可用的种子专属营养库并打开营养工作台
- **THEN** 系统 MUST 在当前页面上下文中打开营养工作台弹层
- **AND** 弹层 MUST 支持营养卡片、Agent 研究和汲取建议的优化体验

### Requirement: 营养库页面不得绕过现有 API 契约
营养库页面接入优化后的营养工作台时 MUST 继续使用 `docs/api/nutrient.yaml` 中已有营养接口，不得在前端新增未定义接口。

#### Scenario: 工作台从营养库页面加载数据
- **WHEN** 营养工作台加载卡片、建议、会话或提交消息
- **THEN** 系统 MUST 调用 `docs/api/nutrient.yaml` 已定义的营养库、营养卡片、营养建议和研究会话接口
- **AND** 系统 MUST 不直接访问本地文件、数据库或 LLM

### Requirement: 统一营养工作台用户侧概念
前端 SHALL 在营养工作台中将用户侧资料统一显示为“营养内容”。前端内部可以继续使用后端返回的 `nutrient-cards` 契约字段，但 UI 文案 MUST NOT 把“营养卡片”表达为独立于营养内容之外的新对象。

#### Scenario: 展示营养内容列表
- **WHEN** 用户打开种子营养工作台
- **THEN** 前端 MUST 展示营养内容列表
- **AND** 列表项 MUST 使用“营养内容”相关文案
- **AND** 前端 MUST NOT 使用“营养卡片”作为用户侧对象名称

#### Scenario: 采纳建议生成草稿
- **WHEN** 用户采纳营养汲取建议
- **THEN** 前端 MUST 表达为保存草稿营养内容
- **AND** 前端 MUST NOT 表达为创建营养卡片

### Requirement: 营养内容生命周期状态展示
前端 SHALL 将后端状态值映射为草稿、已沉淀和已归档。不同状态 MUST 展示不同操作边界。

#### Scenario: 展示草稿状态
- **WHEN** 后端返回状态值为 `unsettled` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“草稿”
- **AND** 前端 MUST 提供编辑、沉淀和删除操作
- **AND** 前端 MUST 允许草稿作为本次枝化生长的临时引用

#### Scenario: 展示已沉淀状态
- **WHEN** 后端返回状态值为 `settled` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“已沉淀”
- **AND** 前端 MUST 提供编辑、归档和默认带入操作
- **AND** 前端 MUST NOT 提供删除操作

#### Scenario: 展示已归档状态
- **WHEN** 后端返回状态值为 `archived` 的工作台营养内容
- **THEN** 前端 MUST 展示状态标签“已归档”
- **AND** 前端 MUST 表达该内容不可被新的枝化生长引用
- **AND** 前端 MUST NOT 提供删除或默认带入操作

### Requirement: 自动准备默认种子专属营养库
前端 SHALL 在打开种子营养工作台时调用 `docs/api/nutrient.yaml` 中由后端定义的默认专属营养库确保接口。前端 MUST NOT 自行拼接默认库名称或绕过后端契约创建营养库。

#### Scenario: 打开营养工作台
- **WHEN** 用户从种子工作区打开营养工作台
- **THEN** 前端 MUST 请求后端确保当前种子的默认专属营养库
- **AND** 成功后前端 MUST 使用返回的库作为草稿沉淀的默认目标
- **AND** 前端 MUST 同步加载当前种子的营养内容列表

#### Scenario: 默认库准备失败
- **WHEN** 默认专属营养库确保请求失败
- **THEN** 前端 MUST 展示局部失败反馈和重试入口
- **AND** 前端 MUST 保留工作台已输入内容
- **AND** 前端 MUST NOT 在本地伪造默认库

### Requirement: 删除草稿营养内容
前端 SHALL 只对草稿态营养内容展示删除操作，并 MUST 调用 `docs/api/nutrient.yaml` 中由后端定义的草稿删除接口。

#### Scenario: 删除草稿
- **WHEN** 用户点击草稿营养内容的删除操作并确认
- **THEN** 前端 MUST 调用草稿删除接口
- **AND** 删除成功后前端 MUST 从列表中移除该草稿
- **AND** 前端 MUST 清空该草稿的详情选中态

#### Scenario: 非草稿不显示删除
- **WHEN** 用户查看已沉淀或已归档营养内容
- **THEN** 前端 MUST NOT 展示删除操作
- **AND** 已沉淀内容 MUST 通过归档退出可引用范围

### Requirement: 默认带入交互
前端 SHALL 将 `defaultForGrowth` 用户侧展示为“默认带入”。已沉淀且默认带入的营养内容 MUST 在枝化生长前默认出现在引用区，但用户 MUST 能在本次生成前移除。

#### Scenario: 设置默认带入
- **WHEN** 用户在已沉淀营养内容上启用默认带入
- **THEN** 前端 MUST 调用 `docs/api/nutrient.yaml` 中的默认带入设置接口
- **AND** 成功后前端 MUST 将该内容标记为默认带入

#### Scenario: 枝化生长默认引用
- **WHEN** 用户打开枝化生长输入框
- **THEN** 前端 MUST 将默认带入的已沉淀营养内容加入默认引用区
- **AND** 用户 MUST 能移除任意默认带入项
- **AND** 前端 MUST 只提交用户本次确认保留的引用
