## 1. 页面结构与视觉基底

- [x] 1.1 重构 `/generators` 页面为导入区、浏览区、详情区的工作台结构
- [x] 1.2 调整页面顶部标题、主操作和状态入口，使其符合 `docs/spec/DESIGN.md` 的 Quiet Command Workspace 风格
- [x] 1.3 基于现有全局样式补充生成器页面专用布局样式，保持深色工作台、紧凑密度和低噪声视觉
- [x] 1.4 实现响应式降级，使窄屏下导入区、浏览区、详情区仍可顺序使用

## 2. 导入体验重构

- [x] 2.1 将导入生成器流程改造为可拖拽上传与点击选择文件的 Skill zip 上传区域
- [x] 2.2 为拖拽悬停、文件已选择、导入中和读取失败状态提供局部视觉反馈
- [x] 2.3 为名称、描述和 zip 文件实现字段级本地校验与缺失提示
- [x] 2.4 确保缺失字段时阻止调用 `POST /api/generators`，且保留用户已填写内容和已选择文件状态
- [x] 2.5 确保导入成功后使用 `GeneratorDetail` 同步列表和详情，并自动选中新导入生成器

## 3. 浏览区重构

- [x] 3.1 将生成器列表重构为易扫描的卡片矩阵或紧凑卡片列表
- [x] 3.2 在生成器项中展示名称、描述、启停状态、内容位置或更新时间等 `GeneratorSummary` 既有信息
- [x] 3.3 保留并优化按启用状态筛选和按名称/描述搜索能力，不新增接口参数
- [x] 3.4 优化列表加载、列表错误、搜索无结果和全空状态
- [x] 3.5 在生成器项中提供详情选择、重新上传、启用和停用的清晰操作入口

## 4. 详情检查器重构

- [x] 4.1 将详情面板重构为 Skill 概览、Skill Markdown、文件条目、系统事实和管理动作分区
- [x] 4.2 使用 `MarkdownViewer` 展示 `GeneratorDetail.skillMarkdown`
- [x] 4.3 使用清晰文件树或条目列表展示 `GeneratorDetail.entries`
- [x] 4.4 展示 `contentLocation`、`enableState`、`updatedAt`、`disabledAt` 等既有系统事实
- [x] 4.5 保留重新上传、启用和停用操作，不增加运行、测试、编辑 Skill 或枝化生长入口

## 5. 重新上传与状态操作

- [x] 5.1 复用拖拽/点击上传体验优化重新上传 Skill zip 流程
- [x] 5.2 确保重新上传提交继续调用 `POST /api/generators/{generatorId}/reupload`
- [x] 5.3 确保启用和停用继续调用 `POST /api/generators/{generatorId}/enable` 与 `POST /api/generators/{generatorId}/disable`
- [x] 5.4 确保所有操作成功后使用返回的 `GeneratorDetail` 更新浏览区和详情区
- [x] 5.5 确保操作失败时保留原页面状态并展示局部失败反馈

## 6. 验证

- [x] 6.1 补充或更新生成器页面相关测试，覆盖拖拽上传提示、字段级校验、搜索筛选和边界限制
- [x] 6.2 运行 `npm run typecheck`
- [x] 6.3 运行 `npm run lint`
- [x] 6.4 运行 `npm test`
- [x] 6.5 使用浏览器检查 `/generators` 页面视觉结构、拖拽状态、空状态和详情区交互
