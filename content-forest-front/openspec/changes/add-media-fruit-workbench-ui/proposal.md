## Why

用户需要在果实详情中查看图片、视频等媒体资源，也需要在枝化生长时上传并引用图片/视频作为创作参考。前端必须把媒体能力融入工作区，而不是把多媒体做成独立复杂素材系统。

## What Changes

- 果实详情展示挂载媒体资源，包括图片预览、视频播放入口和附件信息。
- 枝化生长输入框支持上传图片/视频并引用媒体资源。
- 用户为媒体引用选择用途说明，例如理解内容、参考风格、参考结构、生成文案、平台样例。
- 提交枝化生长时将 `mediaRefs` 映射到 `docs/api/growth.yaml`，并与现有 nutrientRefs、temporaryNutrientCardRefs、geneRefs 共存。
- 工作区资源候选中展示可引用媒体资源，媒体引用走现有资源引用、移除和失败输入恢复体验。
- 不生成纯 HTML preview，不实现图片编辑器、视频剪辑器或视频理解 UI。

## Capabilities

### New Capabilities

- `media-fruit-workbench-ui`: 果实媒体展示、媒体上传、枝化生长媒体引用和用途说明。

### Modified Capabilities

- `content-forest-workbench`: 工作区果实详情、枝化输入框、资源引用、失败输入恢复和任务提交需要接入媒体资源。

## Impact

- 前端页面：种子工作区、果实详情面板、枝化生长输入框、资源引用浮层、API client。
- 依赖接口：后端 `add-media-asset-backend` 更新后的 `docs/api/media.yaml`、`docs/api/fruit.yaml`、`docs/api/growth.yaml`、`docs/api/workspace.yaml`。
- 不修改 API/SQL 契约，不实现设计 preview。
