## ADDED Requirements

### Requirement: 种子编辑 Modal 容器
系统 SHALL 提供种子编辑 Modal 组件，支持「新建」和「编辑」两种模式。Modal SHALL 以全屏遮罩层形式呈现（`fixed inset-0 bg-void/80 backdrop-blur-sm z-50`）。Modal 内容区 SHALL 居中显示，最大宽度 `max-w-3xl`，背景 `bg-void-2 border border-bio-green/20`，无圆角。Modal 顶部 SHALL 显示模式标题（新建模式为「新建种子」，编辑模式为「编辑种子」），右上角提供关闭按钮。

按下 `Escape` 键 SHALL 关闭 Modal（有未保存内容时 SHALL 提示确认）。点击遮罩层背景 SHALL 关闭 Modal（有未保存内容时 SHALL 提示确认）。

#### Scenario: 打开新建 Modal
- **WHEN** 用户点击「+ 新建种子」按钮
- **THEN** Modal 以 `opacity-0 → opacity-100 + translateY(8px) → translateY(0)` 动效打开，时长 `duration-300`
- **AND** Modal 标题显示「新建种子」
- **AND** 所有表单字段为空
- **AND** 焦点自动定位到标题输入框

#### Scenario: 打开编辑 Modal
- **WHEN** 用户点击种子卡片上的「编辑」按钮
- **THEN** Modal 打开，标题显示「编辑种子」
- **AND** 表单预填充当前种子的标题、内容、标签

#### Scenario: 关闭 Modal（无未保存内容）
- **WHEN** 用户点击关闭按钮或按下 `Escape` 键，且表单无修改
- **THEN** Modal 关闭，表单内容清空

#### Scenario: 关闭 Modal（有未保存内容）
- **WHEN** 用户点击关闭按钮或按下 `Escape` 键，且表单有未保存的修改
- **THEN** 系统显示确认 Dialog：「有未保存的内容，确认放弃？」
- **AND** 用户确认后 Modal 关闭
- **AND** 用户取消则 Dialog 关闭，Modal 保持打开

---

### Requirement: 种子表单字段
Modal 表单 SHALL 包含以下字段：
- **标题**（必填）：单行文本输入，`placeholder="种子标题，简短有力"` ，最大长度 100 字符
- **内容**（必填）：多行 Markdown 文本域，最小高度 `min-h-[240px]`，支持实时 Markdown 预览切换
- **标签**（可选）：标签输入组件，支持输入后按 `Enter` 或 `,` 添加标签，支持从已有标签列表自动补全，每个标签可点击 `×` 删除，最多 10 个标签

所有输入框 SHALL 使用 `font-mono text-sm bg-void border border-bio-green/20 focus:border-bio-green/60 focus:outline-none transition-colors duration-300` 样式。

#### Scenario: 标题输入验证
- **WHEN** 用户尝试提交表单但标题为空
- **THEN** 系统在标题输入框下方显示错误提示「标题不能为空」
- **AND** 标题输入框边框变为 `border-death-red`

#### Scenario: 添加标签
- **WHEN** 用户在标签输入框输入文字后按下 `Enter` 或 `,`
- **THEN** 该文字作为新标签添加到标签列表
- **AND** 标签输入框清空
- **AND** 新标签以 `font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green` 样式展示

#### Scenario: 标签自动补全
- **WHEN** 用户在标签输入框输入文字
- **THEN** 系统请求 `GET /api/tags` 获取已有标签列表
- **AND** 以下拉列表形式展示包含输入文字的已有标签（最多 5 条）
- **AND** 用户点击下拉项直接添加该标签

#### Scenario: Markdown 预览切换
- **WHEN** 用户点击内容区域右上角的「预览」切换按钮
- **THEN** 文本域切换为 Markdown 渲染视图
- **AND** 按钮文字变为「编辑」
- **WHEN** 用户再次点击
- **THEN** 视图切换回文本编辑模式

---

### Requirement: 种子保存操作
Modal 底部 SHALL 提供两个操作按钮：「保存草稿」和「发布种子」。

- **保存草稿**：调用 `POST /api/seeds/draft`，保存后 Modal 关闭，种子以草稿状态出现在列表
- **发布种子**：调用 `POST /api/seeds/publish`，保存后 Modal 关闭，种子以活跃状态出现在列表
- **编辑模式下**：仅显示「保存更改」按钮（调用 `PATCH /api/seeds/:id`），不提供状态变更操作（状态变更通过卡片操作完成）

操作进行中 SHALL 显示 loading 状态（按钮文字变为「保存中...」，禁用按钮防止重复提交）。

「发布种子」按钮样式 SHALL 为主 CTA：`bg-bio-green text-void font-mono text-sm tracking-widest uppercase`。「保存草稿」按钮样式 SHALL 为次要按钮：`border border-bio-green/40 text-bio-green font-mono text-sm tracking-widest uppercase`。

#### Scenario: 保存草稿成功
- **WHEN** 用户点击「保存草稿」且表单验证通过
- **THEN** 系统调用 `POST /api/seeds/draft`
- **AND** 请求成功后 Modal 关闭
- **AND** 种子库列表刷新，新草稿卡片出现在列表中
- **AND** 页面顶部短暂显示成功提示「种子已保存为草稿」（3 秒后消失）

#### Scenario: 发布种子成功
- **WHEN** 用户点击「发布种子」且表单验证通过
- **THEN** 系统调用 `POST /api/seeds/publish`
- **AND** 请求成功后 Modal 关闭
- **AND** 若当前 Tab 为「活跃」或「全部」，新种子卡片出现在列表中
- **AND** 页面顶部短暂显示成功提示「种子已发布，可以开始生成果实了」（3 秒后消失）

#### Scenario: 保存失败
- **WHEN** API 请求失败
- **THEN** Modal 保持打开，按钮恢复可点击状态
- **AND** Modal 内显示错误提示「保存失败，请重试」
