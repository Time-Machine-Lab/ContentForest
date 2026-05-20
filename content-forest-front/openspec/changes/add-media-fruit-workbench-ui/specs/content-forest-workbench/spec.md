## ADDED Requirements

### Requirement: 工作区集成媒体资源引用
前端 SHALL 将媒体资源作为工作区可引用资源类型集成到枝化生长输入框中。该能力 MUST 与营养库、临时营养卡片、基因库引用共存，MUST 不破坏现有 `@` 引用和资源移除能力。

#### Scenario: 资源浮层展示媒体资源
- **WHEN** 用户在枝化输入框打开资源引用浮层
- **THEN** 前端 MUST 能展示可引用媒体资源
- **AND** 媒体资源 MUST 与营养库、基因库资源视觉区分

#### Scenario: 媒体引用与现有引用共存
- **WHEN** 用户同时引用营养、临时营养卡片、基因和媒体资源
- **THEN** 前端 MUST 同时展示这些引用
- **AND** 提交生长任务时 MUST 分别映射 nutrientRefs、temporaryNutrientCardRefs、geneRefs 和 mediaRefs

### Requirement: 工作区媒体上传不影响画布操作
前端 SHALL 在工作区中提供媒体上传入口。上传过程 MUST 不阻塞内容树浏览、节点选择和已有输入内容。

#### Scenario: 上传中继续浏览工作区
- **WHEN** 媒体文件正在上传
- **THEN** 前端 MUST 展示上传中状态
- **AND** 用户 MUST 仍可浏览内容树和查看节点详情

#### Scenario: 上传成功后可立即引用
- **WHEN** 媒体上传成功
- **THEN** 前端 MUST 将该媒体加入当前枝化输入可引用资源
- **AND** 用户 MUST 能为该媒体选择用途说明

### Requirement: 工作区恢复失败输入中的媒体引用
前端 SHALL 在恢复最近失败枝化输入时恢复仍可访问的媒体引用。媒体恢复 MUST 不阻塞用户输入、生成器选择、果实数量和现有资源引用恢复。

#### Scenario: 恢复可访问媒体引用
- **WHEN** 最近失败输入包含仍可访问的 mediaRefs
- **THEN** 前端 MUST 恢复这些媒体引用
- **AND** 前端 MUST 恢复对应用途说明

#### Scenario: 跳过不可访问媒体引用
- **WHEN** 最近失败输入中的某个媒体资源已不可访问
- **THEN** 前端 MUST 跳过该媒体引用并展示可理解提示
- **AND** 前端 MUST 继续恢复其他可用输入
