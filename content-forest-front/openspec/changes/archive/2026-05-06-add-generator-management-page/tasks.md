## 1. 契约与页面骨架

- [x] 1.1 阅读 `docs/api/generator.yaml`、`docs/sql/generator.sql`、`docs/spec/DESIGN.md` 和本变更的 design/specs，确认字段、接口和视觉边界。
- [x] 1.2 梳理现有 Nuxt 页面、工作台外壳、API 调用方式和样式复用点。
- [x] 1.3 将 `/generators` 从占位页调整为生成器管理页面骨架，保留工作台外壳一致性。

## 2. 生成器 API 联动

- [x] 2.1 建立生成器前端 API 调用封装，覆盖 `GET /api/generators`、`GET /api/generators/{generatorId}`、`POST /api/generators`、`POST /api/generators/{generatorId}/reupload`、`POST /api/generators/{generatorId}/enable`、`POST /api/generators/{generatorId}/disable`。
- [x] 2.2 按 `docs/api/generator.yaml` 处理 `GeneratorSummary`、`GeneratorDetail`、`ErrorResponse`，不得引入契约外字段作为系统事实。
- [x] 2.3 实现 zip 文件读取为 `zipBase64` 的前端处理，并为缺失文件、空名称、空描述提供提交前校验。

## 3. 列表、筛选与详情

- [x] 3.1 实现生成器列表加载、空状态、失败状态和局部刷新。
- [x] 3.2 实现启用、停用、全部三个状态视图，并基于 `enableState` 进行展示层筛选。
- [x] 3.3 实现名称和描述搜索，并与状态筛选同时生效。
- [x] 3.4 实现点击列表项加载详情，并在右侧详情面板展示 Skill Markdown、entries、contentLocation、enableState 和更新时间。
- [x] 3.5 实现详情加载中、详情失败和未选择详情时的反馈。

## 4. 导入、重新上传与启停

- [x] 4.1 实现导入生成器流程入口和表单界面，提交成功后关闭导入流程并同步列表与详情。
- [x] 4.2 实现重新上传生成器 Skill 流程，提交成功后使用接口返回结果更新当前生成器。
- [x] 4.3 实现启用和停用操作，操作中禁用对应按钮，成功后更新列表和详情状态。
- [x] 4.4 实现导入、重新上传、启用、停用失败时的局部错误反馈，并保持原页面状态不被失败请求污染。

## 5. UI 打磨与边界校验

- [x] 5.1 对齐 `docs/design/previews/generator-module-preview.html` 的最终确认版视觉：列表加详情面板、顶部导入入口、紧凑暗色工具页。
- [x] 5.2 确认页面不展示“用于枝化生长”主操作，不提供删除生成器，不提供在线编辑 Skill 内容。
- [x] 5.3 检查桌面和窄屏布局，确保列表、按钮、详情文本不重叠、不溢出。
- [x] 5.4 运行前端类型检查、Lint、测试或构建，确认变更符合前端开发规范。
