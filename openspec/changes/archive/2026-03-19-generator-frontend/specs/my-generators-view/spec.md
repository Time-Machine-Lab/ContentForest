## ADDED Requirements

### Requirement: 我的生成器视图容器
控制台 SHALL 在 `activeView === 'generators'` 时渲染 `GeneratorView` 组件。该视图 SHALL 包含页面标识区（Hero）、筛选 Tabs、生成器卡片墙、详情侧面板和上传 Modal。

#### Scenario: 进入我的生成器视图
- **WHEN** 用户在控制台侧边栏点击「生成器」导航项
- **THEN** 主内容区以 `opacity-0 → opacity-100` 淡入动效切换至生成器视图
- **AND** 页面标识区显示「// Generator Hub」技术前缀和「我的生成器」大标题
- **AND** 系统自动请求 `GET /api/generators/mine`

#### Scenario: 加载中骨架屏
- **WHEN** `GET /api/generators/mine` 请求进行中
- **THEN** 卡片区显示 3 个骨架占位卡片（`animate-pulse`）

#### Scenario: 加载失败
- **WHEN** API 请求失败
- **THEN** 显示错误提示和「重试」按钮

---

### Requirement: 生成器卡片墙
我的生成器视图 SHALL 以响应式网格（`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`）展示生成器卡片。卡片 SHALL 以 stagger 方式入场（每张 80ms 延迟）。

每张卡片 SHALL 展示：
- 左侧 `3px gene-blue` accent bar
- 生成器名称（`font-serif`）
- 描述文字（截断至 2 行）
- 平台标签 + 内容类型标签
- `outputCapabilities` 标签列表（前缀 `OUTPUT`）
- 来源标签：「自建」或「已安装」
- 安装时间（已安装生成器显示）
- 操作按钮：「卸载」（death-red）+ 「查看详情 →」

#### Scenario: 正常展示卡片
- **WHEN** 生成器列表加载完成
- **THEN** 卡片以 stagger 动效依次淡入，每张延迟 80ms
- **AND** 自建生成器卡片右上角显示「自建」徽章，已安装显示「已安装」徽章

#### Scenario: 空状态
- **WHEN** 用户没有任何生成器（`GET /api/generators/mine` 返回空列表）
- **THEN** 显示空状态占位区：`// EMPTY` 前缀（`text-mutation`）、「还没有生成器」标题（`font-serif`）、「去市场看看，或者上传你自己的 Skill」说明
- **AND** 显示两个 CTA 按钮：「去生成器市场」（跳转 `/generators`）和「上传生成器」（打开上传 Modal）

---

### Requirement: 分组筛选 Tabs
我的生成器视图 SHALL 提供筛选 Tabs：「全部」「自建」「已安装」。每个 Tab SHALL 显示对应数量 badge。切换 Tab 为前端过滤，不重新请求 API。

#### Scenario: 切换筛选 Tab
- **WHEN** 用户点击「自建」Tab
- **THEN** 卡片墙仅显示 `source === 'self'` 的生成器
- **AND** 「自建」Tab 显示激活样式（底部 `2px gene-blue` underline）

---

### Requirement: 生成器详情侧面板
点击生成器卡片「查看详情 →」按钮时，页面右侧 SHALL 滑出详情面板（宽度 `w-96`，`translate-x` 动效）。面板打开时主内容区 SHALL 相应压缩（不遮挡）。面板 SHALL 显示：
- 生成器完整名称和描述
- 平台、内容类型、领域标签
- `outputCapabilities` 完整列表
- Skill 路径（`font-mono` 等宽，路径分段换行显示）
- 「在 AI IDE 中打开 Skill 文件」操作提示（文字说明，不触发跳转）
- 「卸载此生成器」按钮（`death-red`，需确认 Dialog）

#### Scenario: 打开详情面板
- **WHEN** 用户点击卡片上的「查看详情 →」按钮
- **THEN** 详情面板从右侧以 `translate-x-full → translate-x-0` 动效滑入
- **AND** 主卡片墙区域宽度平滑压缩

#### Scenario: 关闭详情面板
- **WHEN** 用户点击面板右上角 `[×]` 或按下 `Escape`
- **THEN** 面板以反向动效滑出，主内容区恢复原宽度

#### Scenario: 从面板卸载生成器
- **WHEN** 用户点击详情面板中的「卸载此生成器」
- **THEN** 显示确认 Dialog：「确认卸载「{名称}」？本地 Skill 文件将被删除。」
- **AND** 用户确认后调用 `DELETE /api/generators/:id/uninstall`
- **AND** 成功后面板关闭，卡片从列表移除，Toast 显示「生成器已卸载」

---

### Requirement: 上传生成器 Modal
我的生成器视图 SHALL 提供「上传生成器」Modal，以表单 + 文件上传方式提交新生成器。Modal 样式规范与种子编辑 Modal 一致（`fixed inset-0 bg-void/80 backdrop-blur-sm z-50`，无圆角，`max-w-2xl`）。

表单字段（必填标 `*`）：
- 生成器名称 `*`（单行输入，最大 60 字符）
- 描述（多行，最大 200 字符）
- 适用平台 `*`（下拉单选：xiaohongshu / douyin / twitter / zhihu / other）
- 内容类型 `*`（多选 Tag：image_text / text_only / video_script / audio）
- 领域分类（下拉单选：lifestyle / tech / fitness / finance / other）
- 输出能力 `*`（Tag 自由输入，`Enter` 或 `,` 添加，`font-mono` 样式展示）
- Skill zip 文件 `*`（拖拽或点击上传，必须包含 SKILL.md，显示文件名和大小）

#### Scenario: 打开上传 Modal
- **WHEN** 用户点击「+ 上传生成器」按钮
- **THEN** Modal 以 `opacity-0 → opacity-100` 动效打开
- **AND** 焦点自动定位到「生成器名称」输入框

#### Scenario: 文件校验
- **WHEN** 用户上传的 zip 文件不包含 SKILL.md（前端无法校验时由后端返回 400）
- **THEN** 显示错误提示「Skill 文件夹必须包含 SKILL.md」

#### Scenario: 提交上传成功
- **WHEN** 用户填写所有必填字段并选择有效 zip 文件后点击「上传并发布」
- **THEN** 按钮变为 loading 态（「上传中...」）
- **AND** 调用 `POST /api/generators/upload`（multipart）
- **AND** 成功后 Modal 关闭，卡片墙刷新，Toast 显示「生成器已发布，并自动安装到你的生成器列表」

#### Scenario: 提交上传失败
- **WHEN** API 请求失败
- **THEN** Modal 保持打开，按钮恢复可点击，Toast 显示「上传失败，请重试」

#### Scenario: 安装完成路径提示
- **WHEN** 上传并安装成功后
- **THEN** Toast 额外显示 Skill 安装路径，方便用户在 AI IDE 中定位
