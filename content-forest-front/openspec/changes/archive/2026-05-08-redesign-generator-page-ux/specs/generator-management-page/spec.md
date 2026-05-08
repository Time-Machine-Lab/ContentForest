## ADDED Requirements

### Requirement: 优化生成器页面工作台结构
前端 SHALL 将 `/generators` 页面组织为面向生成器管理的工作台结构，至少包含导入区域、生成器浏览区域和生成器详情区域。该页面 MUST 继续通过 `docs/api/generator.yaml` 中定义的 `GET /api/generators` 获取列表，通过 `GET /api/generators/{generatorId}` 获取详情。

#### Scenario: 打开生成器工作台
- **WHEN** 用户进入 `/generators`
- **THEN** 前端 MUST 调用 `GET /api/generators`
- **AND** 前端 MUST 展示导入生成器入口、生成器浏览区域和详情区域
- **AND** 前端 MUST 使用 `GeneratorSummary` 与 `GeneratorDetail` 中已有字段组织页面信息
- **AND** 前端 MUST NOT 要求后端提供 `docs/api/generator.yaml` 未定义的新字段

#### Scenario: 选择生成器后查看详情
- **WHEN** 用户在浏览区域选择一个生成器
- **THEN** 前端 MUST 调用 `GET /api/generators/{generatorId}`
- **AND** 前端 MUST 在详情区域展示该生成器的 Skill Markdown、文件条目和系统事实
- **AND** 前端 MUST 保持浏览区域仍可搜索、筛选和选择其他生成器

### Requirement: 支持拖拽导入生成器 Skill zip
前端 SHALL 在导入生成器流程中支持拖拽上传 Skill zip，同时保留点击选择文件能力。文件选择方式只影响前端交互，导入请求 MUST 继续调用 `docs/api/generator.yaml` 中定义的 `POST /api/generators`，并提交 `name`、`description` 和 `zipBase64`。

#### Scenario: 拖拽 zip 到导入区域
- **WHEN** 用户将 zip 文件拖拽到导入区域
- **THEN** 前端 MUST 展示拖拽悬停反馈
- **AND** 前端 MUST 在释放文件后记录该文件并展示文件名
- **AND** 前端 MUST NOT 在文件释放时立即调用 `POST /api/generators`

#### Scenario: 点击选择 zip 文件
- **WHEN** 用户点击导入区域并选择 zip 文件
- **THEN** 前端 MUST 记录该文件并展示文件名
- **AND** 前端 MUST 允许用户继续填写或修改生成器名称和描述

#### Scenario: 提交导入请求
- **WHEN** 用户提供非空名称、非空描述和 zip 文件后提交导入
- **THEN** 前端 MUST 将 zip 文件读取为 base64
- **AND** 前端 MUST 调用 `POST /api/generators`
- **AND** 前端 MUST 使用接口返回的 `GeneratorDetail` 更新列表和详情区域

### Requirement: 提供字段级导入提示
前端 SHALL 在导入生成器时对名称、描述和 zip 文件进行本地校验，并在对应区域展示缺失提示。缺失信息时前端 MUST 阻止提交 `POST /api/generators`。

#### Scenario: 名称缺失
- **WHEN** 用户未填写生成器名称并尝试提交导入
- **THEN** 前端 MUST 阻止调用 `POST /api/generators`
- **AND** 前端 MUST 在名称字段附近展示缺失提示
- **AND** 前端 MUST 保留用户已选择的 zip 文件和已填写的描述

#### Scenario: 描述缺失
- **WHEN** 用户未填写生成器描述并尝试提交导入
- **THEN** 前端 MUST 阻止调用 `POST /api/generators`
- **AND** 前端 MUST 在描述字段附近展示缺失提示
- **AND** 前端 MUST 保留用户已选择的 zip 文件和已填写的名称

#### Scenario: zip 文件缺失
- **WHEN** 用户未选择 zip 文件并尝试提交导入
- **THEN** 前端 MUST 阻止调用 `POST /api/generators`
- **AND** 前端 MUST 在文件上传区域展示缺失提示
- **AND** 前端 MUST 保留用户已填写的名称和描述

#### Scenario: 导入接口失败
- **WHEN** `POST /api/generators` 返回错误
- **THEN** 前端 MUST 展示导入失败反馈
- **AND** 前端 MUST 保留用户已填写的名称、描述和已选择文件状态

### Requirement: 优化生成器浏览和扫描
前端 SHALL 优化生成器浏览区域，使用户可以快速扫描生成器名称、描述、启停状态和系统信息。浏览区域 MUST 继续基于 `GET /api/generators` 返回的 `GeneratorSummary` 进行展示、搜索和筛选。

#### Scenario: 浏览生成器卡片
- **WHEN** `GET /api/generators` 返回一个或多个生成器
- **THEN** 前端 MUST 以易扫描的卡片或紧凑列表展示生成器
- **AND** 每个生成器项 MUST 展示 `GeneratorSummary.name`
- **AND** 每个生成器项 MUST 展示 `GeneratorSummary.description`
- **AND** 每个生成器项 MUST 展示 `GeneratorSummary.enableState`
- **AND** 每个生成器项 MUST 展示 `GeneratorSummary.contentLocation` 或 `GeneratorSummary.updatedAt` 中至少一项系统信息

#### Scenario: 搜索和状态筛选同时生效
- **WHEN** 用户输入搜索关键字并选择启用、停用或全部视图
- **THEN** 前端 MUST 基于 `GeneratorSummary.name` 和 `GeneratorSummary.description` 执行搜索
- **AND** 前端 MUST 基于 `GeneratorSummary.enableState` 执行状态筛选
- **AND** 前端 MUST NOT 为搜索或筛选调用 `docs/api/generator.yaml` 未定义的接口参数

#### Scenario: 浏览区为空
- **WHEN** 当前搜索和筛选条件下没有可展示生成器
- **THEN** 前端 MUST 展示空状态
- **AND** 前端 MUST 在无搜索关键字时提供导入生成器入口
- **AND** 前端 MUST 在有搜索关键字时提示用户调整搜索或筛选条件

### Requirement: 优化生成器详情检查器
前端 SHALL 将选中生成器详情组织为清晰的详情检查器。详情检查器 MUST 使用 `GET /api/generators/{generatorId}` 返回的 `GeneratorDetail`，并保留重新上传、启用和停用管理动作。

#### Scenario: 展示 Skill 详情信息
- **WHEN** 生成器详情加载成功
- **THEN** 前端 MUST 展示 `GeneratorDetail.skillMarkdown`
- **AND** 前端 MUST 展示 `GeneratorDetail.entries`
- **AND** 前端 MUST 展示 `GeneratorDetail.contentLocation`
- **AND** 前端 MUST 展示 `GeneratorDetail.enableState`
- **AND** 前端 MUST 展示更新时间和停用时间等接口返回的系统事实

#### Scenario: 执行详情区管理操作
- **WHEN** 用户在详情检查器中执行重新上传、启用或停用操作
- **THEN** 前端 MUST 调用 `POST /api/generators/{generatorId}/reupload`、`POST /api/generators/{generatorId}/enable` 或 `POST /api/generators/{generatorId}/disable` 中对应接口
- **AND** 前端 MUST 使用接口返回的 `GeneratorDetail` 更新浏览区域和详情区域

#### Scenario: 详情区保持领域边界
- **WHEN** 用户查看生成器详情
- **THEN** 前端 MUST NOT 提供运行生成器、测试生成器、编辑 Skill 文件内容或发起枝化生长的操作
- **AND** 前端 MUST NOT 提供删除生成器操作
