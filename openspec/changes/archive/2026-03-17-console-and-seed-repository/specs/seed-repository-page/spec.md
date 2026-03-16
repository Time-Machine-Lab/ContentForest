## ADDED Requirements

### Requirement: 种子卡片墙展示
种子库页面 SHALL 以卡片网格（Card Wall）形式展示当前用户的所有种子。网格 SHALL 为响应式三列布局（`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5`）。页面加载时 SHALL 自动请求种子列表 API（`GET /api/seeds`），默认展示「活跃」状态的种子。

每张种子卡片 SHALL 展示：种子标题、状态标签（草稿/活跃/归档）、内容摘要（正文前 80 字）、标签列表、果实数量、创建时间、快捷操作按钮组。

卡片样式 SHALL 遵循 `design-system` 规范：`bg-void-2/60 backdrop-blur border border-bio-green/20 p-6`，无圆角，悬停时边框透明度提升至 `/60`。

#### Scenario: 正常加载种子列表
- **WHEN** 用户进入种子库页面
- **THEN** 系统请求 `GET /api/seeds?status=active`
- **AND** 加载完成后以卡片网格展示结果
- **AND** 加载中显示骨架屏（3 个占位卡片）

#### Scenario: 空状态
- **WHEN** 当前筛选条件下没有种子
- **THEN** 显示空状态占位区，包含提示文案和「创建第一个种子」CTA 按钮
- **AND** 空状态文案根据当前筛选状态变化（如归档列表为空时显示「没有已归档的种子」）

#### Scenario: 加载失败
- **WHEN** 种子列表 API 请求失败
- **THEN** 显示错误提示，包含「重试」按钮

---

### Requirement: 种子状态筛选
种子库页面 SHALL 提供状态筛选 Tabs，允许用户按状态过滤种子列表。Tabs SHALL 包含：「活跃」（默认）、「草稿」、「归档」、「全部」。Tabs 样式 SHALL 使用 `font-mono text-xs tracking-widest uppercase`，激活态使用 `text-bio-green border-b border-bio-green`。

切换 Tab 时 SHALL 重新请求 API 并更新列表，不需要前端缓存。

#### Scenario: 切换状态筛选
- **WHEN** 用户点击「草稿」Tab
- **THEN** 系统请求 `GET /api/seeds?status=draft`
- **AND** 列表更新为草稿状态的种子
- **AND** 「草稿」Tab 显示激活样式

#### Scenario: 筛选「全部」
- **WHEN** 用户点击「全部」Tab
- **THEN** 系统请求 `GET /api/seeds`（不带 status 参数）
- **AND** 列表展示所有状态的种子，每张卡片状态标签可区分

---

### Requirement: 种子卡片快捷操作
每张种子卡片 SHALL 提供快捷操作按钮组，根据种子当前状态展示不同操作：

- **草稿状态**：「编辑」、「发布」、「删除」
- **活跃状态**：「编辑」、「归档」
- **归档状态**：「回档」、「删除」

操作按钮 SHALL 使用 `font-mono text-xs` 样式，危险操作（删除）使用 `text-death-red`。

#### Scenario: 发布草稿
- **WHEN** 用户点击草稿卡片上的「发布」按钮
- **THEN** 系统调用 `POST /api/seeds/publish`（传入 seedId）
- **AND** 操作成功后该卡片状态标签更新为「活跃」
- **AND** 若当前 Tab 为「草稿」，该卡片从列表消失

#### Scenario: 归档活跃种子
- **WHEN** 用户点击活跃卡片上的「归档」按钮
- **THEN** 系统调用 `PUT /api/seeds/:id/archive`
- **AND** 操作成功后，若当前 Tab 为「活跃」，该卡片从列表消失

#### Scenario: 回档归档种子
- **WHEN** 用户点击归档卡片上的「回档」按钮
- **THEN** 系统调用 `PUT /api/seeds/:id/restore`
- **AND** 操作成功后，若当前 Tab 为「归档」，该卡片从列表消失

#### Scenario: 删除种子确认
- **WHEN** 用户点击「删除」按钮
- **THEN** 系统显示确认 Dialog，文案为「确认删除「{种子标题}」？此操作不可撤销。」
- **AND** 用户确认后调用 `DELETE /api/seeds/:id`
- **AND** 删除成功后该卡片从列表移除
- **AND** 用户取消则 Dialog 关闭，不执行删除

#### Scenario: 编辑种子
- **WHEN** 用户点击「编辑」按钮
- **THEN** 种子编辑 Modal 打开，并预填充当前种子的标题、内容、标签

---

### Requirement: 种子搜索
种子库页面 SHALL 提供搜索输入框，允许用户按关键词过滤当前列表。搜索 SHALL 为前端过滤（在当前已加载的列表中搜索），不触发新的 API 请求。搜索 SHALL 匹配种子标题和标签。

搜索框 SHALL 使用 `font-mono text-sm bg-void border border-bio-green/20 focus:border-bio-green/60` 样式。

#### Scenario: 输入搜索关键词
- **WHEN** 用户在搜索框输入关键词
- **THEN** 卡片列表实时过滤，仅显示标题或标签包含该关键词的卡片
- **AND** 若无匹配结果，显示空状态「没有匹配「{关键词}」的种子」

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索框
- **THEN** 列表恢复显示当前 Tab 下的全部种子
