# seed-library Specification

## Purpose
TBD - created by archiving change add-content-forest-workbench. Update Purpose after archive.
## Requirements
### Requirement: 查看未归档种子库
前端 SHALL 在种子库默认视图中展示未归档种子索引。该视图 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds`，并只使用 `SeedSummary` 契约中存在的信息进行种子索引展示。

#### Scenario: 打开种子库默认视图
- **WHEN** 用户打开种子库页面
- **THEN** 前端 MUST 调用 `GET /api/seeds`
- **AND** 前端 MUST 在种子索引区展示返回的未归档种子
- **AND** 前端 MUST 允许用户选择一个种子进入中央阅读器

#### Scenario: 未归档种子为空
- **WHEN** `GET /api/seeds` 返回空列表
- **THEN** 前端 MUST 展示空状态
- **AND** 前端 MUST 提供新建种子的操作入口

### Requirement: 查看已归档种子
前端 SHALL 在种子库页面内部提供已归档视图。该视图 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/archived`，并在种子索引区展示已归档种子。

#### Scenario: 切换到已归档视图
- **WHEN** 用户在种子库页面切换到已归档视图
- **THEN** 前端 MUST 调用 `GET /api/seeds/archived`
- **AND** 前端 MUST 在种子索引区展示返回的已归档种子
- **AND** 前端 MUST 允许用户选择已归档种子查看中央阅读器

#### Scenario: 已归档种子为空
- **WHEN** `GET /api/seeds/archived` 返回空列表
- **THEN** 前端 MUST 展示已归档视图的空状态

### Requirement: 查看种子详情
前端 SHALL 支持用户从种子索引打开种子详情。详情数据 MUST 调用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/{seedId}` 获取，并在中央阅读器展示标题、归档状态和 Markdown 正文。

#### Scenario: 选择种子卡片
- **WHEN** 用户点击一个种子索引项
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}`
- **AND** 前端 MUST 在中央阅读器展示该种子的标题、归档状态和 Markdown 正文
- **AND** 前端 MUST 保持种子索引区可继续搜索、切换和选择其他种子

#### Scenario: 详情读取失败
- **WHEN** `GET /api/seeds/{seedId}` 返回错误
- **THEN** 前端 MUST 在阅读器或详情区域展示可理解的失败反馈
- **AND** 前端 MUST 保持种子库索引可用

### Requirement: 创建种子
前端 SHALL 通过居中 Command Modal 创建种子。创建请求 MUST 调用 `docs/api/seed.yaml` 中定义的 `POST /api/seeds`，并提交非空标题和非空 Markdown 正文。

#### Scenario: 成功创建种子
- **WHEN** 用户在 Command Modal 中提交非空标题和非空 Markdown 正文
- **THEN** 前端 MUST 调用 `POST /api/seeds`
- **AND** 前端 MUST 在创建成功后关闭 Command Modal
- **AND** 前端 MUST 刷新当前种子视图或将新种子插入当前视图

#### Scenario: 阻止空标题或空正文创建
- **WHEN** 用户提交空标题或空 Markdown 正文
- **THEN** 前端 MUST 阻止提交 `POST /api/seeds`
- **AND** 前端 MUST 在 Command Modal 中展示字段错误

#### Scenario: 创建请求失败
- **WHEN** `POST /api/seeds` 返回错误
- **THEN** 前端 MUST 保留用户已输入的标题和 Markdown 正文
- **AND** 前端 MUST 展示创建失败反馈

### Requirement: 编辑种子
前端 SHALL 支持在种子阅读器中切换到编辑态编辑种子标题和 Markdown 正文。编辑请求 MUST 调用 `docs/api/seed.yaml` 中定义的 `PATCH /api/seeds/{seedId}`。

#### Scenario: 成功保存编辑
- **WHEN** 用户在编辑态中提交非空标题或非空 Markdown 正文更新
- **THEN** 前端 MUST 调用 `PATCH /api/seeds/{seedId}`
- **AND** 前端 MUST 使用接口返回的 `SeedDetail` 更新阅读器
- **AND** 前端 MUST 同步更新种子索引中可见的标题和更新时间
- **AND** 前端 MUST 在保存成功后回到阅读态

#### Scenario: 阻止空内容保存
- **WHEN** 用户将标题或 Markdown 正文编辑为空并尝试保存
- **THEN** 前端 MUST 阻止提交 `PATCH /api/seeds/{seedId}`
- **AND** 前端 MUST 展示字段错误

#### Scenario: 保存失败
- **WHEN** `PATCH /api/seeds/{seedId}` 返回错误
- **THEN** 前端 MUST 保留用户未保存的编辑内容
- **AND** 前端 MUST 展示保存失败反馈
- **AND** 前端 MUST NOT 将失败请求伪装为已保存状态

### Requirement: 归档与回档种子
前端 SHALL 支持用户归档未归档种子和回档已归档种子。归档 MUST 调用 `docs/api/seed.yaml` 中定义的 `POST /api/seeds/{seedId}/archive`，回档 MUST 调用 `POST /api/seeds/{seedId}/restore`。归档和回档入口 MUST 作为低频管理操作展示，不得与打开工作区主操作并列成同等优先级。

#### Scenario: 归档未归档种子
- **WHEN** 用户在未归档种子的管理入口中执行归档
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/archive`
- **AND** 前端 MUST 将该种子从未归档视图中移除或刷新未归档视图

#### Scenario: 回档已归档种子
- **WHEN** 用户在已归档种子的管理入口中执行回档
- **THEN** 前端 MUST 调用 `POST /api/seeds/{seedId}/restore`
- **AND** 前端 MUST 将该种子从已归档视图中移除或刷新已归档视图

#### Scenario: 归档或回档失败
- **WHEN** 归档或回档接口返回错误
- **THEN** 前端 MUST 保持当前种子状态不变
- **AND** 前端 MUST 展示操作失败反馈

### Requirement: 种子工作区入口
前端 SHALL 在种子阅读器顶部提供进入工作区的主操作入口。入口需要使用 `docs/api/seed.yaml` 中定义的 `GET /api/seeds/{seedId}/root-node` 读取根节点信息；已归档种子的工作区 MUST 以只读语义进入或展示只读提示。

#### Scenario: 打开未归档种子的工作区入口
- **WHEN** 用户点击当前未归档种子的打开工作区主操作
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}/root-node`
- **AND** 前端 MUST 使用返回的根节点信息进入对应种子工作区路由或工作区占位视图

#### Scenario: 打开已归档种子的工作区入口
- **WHEN** 用户点击当前已归档种子的打开工作区主操作
- **THEN** 前端 MUST 调用 `GET /api/seeds/{seedId}/root-node`
- **AND** 前端 MUST 根据返回的 `workspaceReadOnly` 展示只读工作区语义

### Requirement: 种子 API 错误与加载反馈
前端 SHALL 为所有种子 API 调用提供加载、成功和失败反馈。失败反馈 MUST 不清空用户输入，且 MUST 不让前端将失败操作伪装为系统事实。

#### Scenario: 列表加载中
- **WHEN** 前端正在请求种子列表
- **THEN** 前端 MUST 展示列表加载状态

#### Scenario: 写操作进行中
- **WHEN** 前端正在创建、编辑、归档或回档种子
- **THEN** 前端 MUST 禁用对应提交入口或展示进行中状态
- **AND** 前端 MUST 保持其他不冲突的页面浏览能力

#### Scenario: 写操作失败
- **WHEN** 创建、编辑、归档或回档请求失败
- **THEN** 前端 MUST 展示失败反馈
- **AND** 前端 MUST 不基于失败请求更新种子系统状态

### Requirement: 种子库阅读工作台结构
前端 SHALL 将 `/seeds` 页面组织为面向种子阅读与管理的工作台结构，至少包含种子索引区、种子阅读器和辅助信息区。该结构 MUST 保留 `docs/design/previews/seed-library-redesign-preview.html` 的主要视觉和交互方向，并符合 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 风格。

#### Scenario: 打开种子阅读工作台
- **WHEN** 用户打开 `/seeds`
- **THEN** 前端 MUST 展示种子索引区、种子阅读器和辅助信息区
- **AND** 前端 MUST 保持深色、紧凑、低噪声的工作台视觉
- **AND** 前端 MUST NOT 在页面上堆叠解释产品概念或设计意图的说明型文案

#### Scenario: 窄屏阅读工作台降级
- **WHEN** 页面宽度不足以稳定展示三栏
- **THEN** 前端 MUST 将辅助信息区隐藏或下移
- **AND** 前端 MUST 保持种子索引、种子阅读器和核心操作可用

### Requirement: 种子文档目录与系统事实分离
前端 SHALL 在种子阅读器之外展示文档目录和系统事实。文档目录可以由前端基于 `SeedDetail.markdown` 中的标题结构派生，系统事实 MUST 使用 `SeedDetail` 已有字段展示。

#### Scenario: 展示文档目录
- **WHEN** `GET /api/seeds/{seedId}` 返回的 `SeedDetail.markdown` 包含可识别标题
- **THEN** 前端 MUST 在辅助信息区展示文档目录
- **AND** 前端 MUST 允许用户通过目录理解或跳转到正文结构
- **AND** 前端 MUST NOT 要求后端返回目录字段

#### Scenario: 展示系统事实
- **WHEN** 种子详情加载成功
- **THEN** 前端 MUST 在辅助信息区展示 `SeedDetail.contentLocation`、`SeedDetail.rootNodeId` 和 `SeedDetail.updatedAt`
- **AND** 前端 MUST NOT 将系统事实混入 Markdown 正文阅读流

### Requirement: 种子卡片基因库快捷入口
种子列表中的每个种子卡片 SHALL 提供基因库快捷入口，用于进入该种子的基因库页面。该入口 MUST 归属于当前种子上下文，且 MUST NOT 作为全局侧边栏入口出现。

#### Scenario: 从种子卡片打开基因库
- **WHEN** 用户在种子卡片上点击基因库快捷入口
- **THEN** 前端 MUST 进入该种子的基因库页面
- **AND** 前端 MUST 保持种子卡片本身的选中行为不受影响

#### Scenario: 种子卡片仍保留主选择语义
- **WHEN** 用户点击种子卡片主体区域
- **THEN** 前端 MUST 继续执行种子选中逻辑
- **AND** 前端 MUST NOT 因新增基因库入口而改变卡片的主交互语义

### Requirement: 种子上下文中的基因库入口
种子详情与种子列表 SHALL 继续提供进入当前种子基因库的路径，但该路径 MUST 维持种子级语义，不得升级为全局页签。

#### Scenario: 从种子上下文进入基因库
- **WHEN** 用户从种子详情或种子卡片进入基因库
- **THEN** 前端 MUST 进入当前种子的基因库页面
- **AND** 前端 MUST NOT 显示全局基因库导航入口

