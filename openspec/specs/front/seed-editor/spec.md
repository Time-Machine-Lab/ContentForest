# Seed Editor Spec

## Purpose

定义种子编辑 Modal 的行为、表单字段和提交操作规范。

## Requirements

### Requirement: 种子编辑 Modal 容器
系统 SHALL 提供种子编辑 Modal 组件，支持「新建」和「编辑」两种模式。Modal SHALL 以全屏遮罩层形式呈现（`fixed inset-0 bg-void/80 backdrop-blur-sm z-50`）。Modal 内容区 SHALL 居中显示，最大宽度 `max-w-3xl`，背景 `bg-void-2 border border-bio-green/20`，无圆角。Modal 顶部 SHALL 显示模式标题（新建模式为「新建种子」，编辑模式为「编辑种子」），右上角提供关闭按钮。

按下 `Escape` 键 SHALL 关闭 Modal（有未保存内容时 SHALL 提示确认）。点击遮罩层背景 SHALL 关闭 Modal（有未保存内容时 SHALL 提示确认）。

#### Scenario: 打开新建 Modal
- **WHEN** 用户点击「+ 新建种子」按钮
- **THEN** Modal 以 `opacity-0 → opacity-100` 动效打开，时长 `duration-300`
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
- **标题**（必填）：单行文本输入，`placeholder="种子标题，简短有力"`，最大长度 100 字符
- **内容**（可选）：多行 Markdown 文本域，最小高度 `min-h-[240px]`，支持实时 Markdown 预览切换
- **标签**（可选）：标签输入组件，支持 `Enter` 或 `,` 添加，支持已有标签自动补全，最多 10 个

所有输入框 SHALL 使用 `font-mono text-sm bg-void border border-bio-green/20 focus:border-bio-green/60 focus:outline-none transition-colors duration-300` 样式。

#### Scenario: 标题输入验证
- **WHEN** 用户尝试提交表单但标题为空
- **THEN** 系统在标题输入框下方显示错误提示「标题不能为空」
- **AND** 标题输入框边框变为 `border-death-red`

#### Scenario: 添加标签
- **WHEN** 用户在标签输入框输入文字后按下 `Enter` 或 `,`
- **THEN** 该文字作为新标签添加到标签列表
- **AND** 标签以 `font-mono text-xs px-2 py-1 border border-bio-green/30 text-bio-green` 样式展示

#### Scenario: 标签自动补全
- **WHEN** 用户在标签输入框输入文字
- **THEN** 系统请求 `GET /api/tags` 获取已有标签列表（本地缓存）
- **AND** 以下拉列表形式展示最多 5 条匹配项
- **AND** 用户点击下拉项直接添加该标签

#### Scenario: Markdown 预览切换
- **WHEN** 用户点击内容区域右上角的「// 预览」切换按钮
- **THEN** 文本域切换为 Markdown 渲染视图（使用 marked + DOMPurify）
- **AND** 按钮文字变为「// 编辑」
- **WHEN** 用户再次点击
- **THEN** 视图切换回文本编辑模式

---

### Requirement: 种子保存操作
Modal 底部 SHALL 提供操作按钮：
- **新建模式**：「保存草稿」（次要）+ 「发布种子」（主 CTA）
- **编辑模式**：仅「保存更改」（主 CTA）

操作进行中 SHALL 禁用按钮，显示「保存中...」。

#### Scenario: 保存草稿成功
- **WHEN** 用户点击「保存草稿」且标题不为空
- **THEN** 系统调用 `POST /api/seeds/draft`
- **AND** 成功后 Modal 关闭，种子库列表刷新
- **AND** Toast 显示「种子已保存为草稿」

#### Scenario: 发布种子成功
- **WHEN** 用户点击「发布种子」且标题不为空
- **THEN** 系统调用 `POST /api/seeds/publish`
- **AND** 成功后 Modal 关闭，种子库列表刷新
- **AND** Toast 显示「种子已发布，可以开始生成果实了」

#### Scenario: 保存更改成功
- **WHEN** 用户在编辑模式点击「保存更改」且标题不为空
- **THEN** 系统调用 `PATCH /api/seeds/:id`
- **AND** 成功后 Modal 关闭，种子库列表刷新
- **AND** Toast 显示「种子已更新」

#### Scenario: 保存失败
- **WHEN** API 请求失败
- **THEN** Modal 保持打开，按钮恢复可点击
- **AND** Toast 显示「保存失败，请重试」
