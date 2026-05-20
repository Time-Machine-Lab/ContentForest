## ADDED Requirements

### Requirement: 果实详情展示媒体资源
前端 SHALL 在果实详情中展示后端返回的媒体资源列表。媒体展示 MUST 与 Markdown 正文分区，MUST 不依赖 Markdown 中的系统 meta。

#### Scenario: 展示图片媒体
- **WHEN** 用户查看挂载图片资源的果实详情
- **THEN** 前端 MUST 在媒体资源区展示图片预览
- **AND** 前端 MUST 保留 Markdown 正文展示

#### Scenario: 展示视频媒体
- **WHEN** 用户查看挂载视频资源的果实详情
- **THEN** 前端 MUST 在媒体资源区展示视频播放或预览入口
- **AND** 前端 MUST 不要求视频必须能被 Agent 理解

#### Scenario: 无媒体果实
- **WHEN** 用户查看没有媒体挂载的果实详情
- **THEN** 前端 MUST 正常展示 Markdown 正文和果实状态
- **AND** 前端 MUST 不展示误导性的空媒体错误

### Requirement: 上传媒体资源
前端 SHALL 支持用户在工作区上传图片和视频作为媒体资源。上传 MUST 调用 `docs/api/media.yaml` 中定义的接口。

#### Scenario: 上传图片成功
- **WHEN** 用户在枝化生长输入区域上传图片
- **THEN** 前端 MUST 调用媒体上传接口
- **AND** 上传成功后 MUST 获得 mediaAssetId
- **AND** 前端 MUST 将该媒体加入可引用资源列表

#### Scenario: 上传失败
- **WHEN** 媒体上传接口返回失败
- **THEN** 前端 MUST 展示可理解错误
- **AND** 前端 MUST 保留用户当前枝化输入内容

### Requirement: 枝化生长引用媒体资源
前端 SHALL 允许用户在枝化生长时引用媒体资源并选择用途说明。提交生长任务时 MUST 将媒体引用映射到 `docs/api/growth.yaml` 的 mediaRefs。

#### Scenario: 引用媒体并选择用途
- **WHEN** 用户选择一个媒体资源作为枝化输入引用
- **THEN** 前端 MUST 要求或引导用户选择用途说明
- **AND** 前端 MUST 将该媒体以引用标签或列表项展示

#### Scenario: 提交媒体引用
- **WHEN** 用户提交枝化生长
- **THEN** 前端 MUST 在 `POST /api/growth-tasks` 请求中包含 mediaRefs
- **AND** 每个 mediaRef MUST 包含媒体资源标识和用途说明
- **AND** 前端 MUST 保持 nutrientRefs、temporaryNutrientCardRefs 和 geneRefs 的现有请求映射不变

#### Scenario: 移除媒体引用
- **WHEN** 用户移除已引用媒体资源
- **THEN** 前端 MUST 从本地引用列表移除该资源
- **AND** 下一次提交生长任务时 MUST 不包含被移除的 mediaRef

#### Scenario: 恢复失败输入媒体引用
- **WHEN** 用户从最近失败任务恢复枝化输入
- **THEN** 前端 MUST 恢复仍可访问的 mediaRefs
- **AND** 前端 MUST 恢复媒体用途说明

### Requirement: 展示媒体处理能力提示
前端 SHALL 在用户引用媒体资源时展示必要能力提示。对于当前 Agent 未必支持理解的视频或其他媒体，前端 MUST 不把上传成功表达为理解能力可用。

#### Scenario: 引用视频资源
- **WHEN** 用户引用视频作为枝化输入
- **THEN** 前端 MUST 允许该资源作为引用进入输入列表
- **AND** 前端 MUST 在需要时提示视频可展示和引用但不保证被当前 Agent 理解
