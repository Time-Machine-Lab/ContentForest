## 1. 契约与依赖确认

- [x] 1.1 确认后端 `add-media-asset-backend` 已更新 `docs/api/media.yaml`、`docs/api/fruit.yaml`、`docs/api/growth.yaml` 和 `docs/api/workspace.yaml`
- [x] 1.2 阅读 `docs/spec/DESIGN.md` 和 `docs/spec/前端开发规范文档.md`
- [x] 1.3 确认本提案不需要生成纯 HTML preview
- [x] 1.4 确认后端 `mediaRefs` 已与 Reference Planner 对齐，前端只负责上传、引用、用途说明和请求映射

## 2. API Client 与状态模型

- [x] 2.1 增加媒体上传、详情和内容访问 API client
- [x] 2.2 扩展果实详情类型，消费媒体资源列表
- [x] 2.3 扩展枝化输入状态，支持 mediaRefs、用途说明、上传中和上传失败状态
- [x] 2.4 扩展工作区资源候选，支持媒体资源与现有营养、临时营养卡片、基因引用共存
- [x] 2.5 扩展最近失败输入恢复模型，支持恢复仍可访问的 mediaRefs

## 3. 果实媒体展示

- [x] 3.1 在果实详情中增加媒体资源区
- [x] 3.2 实现图片预览展示
- [x] 3.3 实现视频播放或预览入口
- [x] 3.4 确保无媒体果实保持现有详情展示

## 4. 枝化输入媒体引用

- [x] 4.1 在枝化输入框或详情面板中增加媒体上传入口
- [x] 4.2 上传成功后创建媒体引用标签
- [x] 4.3 实现媒体用途选择和可选备注输入
- [x] 4.4 提交 `POST /api/growth-tasks` 时映射 mediaRefs，并保持 nutrientRefs、temporaryNutrientCardRefs、geneRefs 原有映射不变
- [x] 4.5 支持移除媒体引用，并确保提交时排除已移除资源
- [x] 4.6 支持最近失败任务恢复时恢复媒体引用；不可访问媒体显示提示并跳过

## 5. 验证

- [x] 5.1 补充果实媒体展示测试
- [x] 5.2 补充媒体上传成功、失败和移除测试
- [x] 5.3 补充枝化生长 mediaRefs 请求映射测试
- [x] 5.4 补充媒体与营养、临时营养卡片、基因引用共存测试
- [x] 5.5 补充最近失败输入恢复 mediaRefs 的测试
- [x] 5.6 手动验证工作区画布、节点详情、枝化输入框和现有资源引用不受影响
- [x] 5.7 运行前端测试、类型检查、lint 和 OpenSpec 严格校验
