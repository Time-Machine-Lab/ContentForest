## ADDED Requirements

### Requirement: 工作区展示种子主简报入口
前端 SHALL 在种子工作区展示当前种子的主简报入口和状态。该状态 MUST 来自 `docs/api/workspace.yaml` 中的工作区快照主简报摘要。

#### Scenario: 已有主简报
- **WHEN** 工作区快照返回当前种子存在主简报
- **THEN** 前端 MUST 展示主简报入口、更新时间和查看操作
- **AND** 前端 MUST 不在工作区快照中假定存在完整 Markdown 正文

#### Scenario: 尚未生成主简报
- **WHEN** 工作区快照返回当前种子尚未生成主简报
- **THEN** 前端 MUST 展示未生成空态
- **AND** 前端 MUST 提供手动生成主简报入口
- **AND** 前端 MUST 保持枝化生长输入框可用

### Requirement: 生成种子主简报
前端 SHALL 支持用户从工作区手动生成种子主简报。生成请求 MUST 调用 `docs/api/seed.yaml` 中定义的主简报生成接口。

#### Scenario: 成功生成主简报
- **WHEN** 用户点击生成主简报
- **THEN** 前端 MUST 展示生成中状态
- **AND** 生成成功后 MUST 展示主简报内容或摘要
- **AND** 前端 MUST 刷新工作区快照或同步主简报摘要

#### Scenario: 生成失败
- **WHEN** 主简报生成接口返回失败
- **THEN** 前端 MUST 展示可理解失败反馈
- **AND** 前端 MUST 允许用户继续查看内容树和发起枝化生长

### Requirement: 查看编辑刷新种子主简报
前端 SHALL 支持用户查看、编辑和刷新当前种子主简报。查看、编辑和刷新请求 MUST 使用 `docs/api/seed.yaml` 中定义的接口。

#### Scenario: 查看主简报正文
- **WHEN** 用户打开主简报面板
- **THEN** 前端 MUST 按需读取主简报详情
- **AND** 前端 MUST 以 Markdown 阅读形态展示正文

#### Scenario: 编辑主简报
- **WHEN** 用户编辑主简报并提交非空 Markdown
- **THEN** 前端 MUST 调用主简报编辑接口
- **AND** 保存成功后 MUST 更新面板内容和更新时间

#### Scenario: 刷新主简报
- **WHEN** 用户点击刷新主简报
- **THEN** 前端 MUST 调用主简报刷新接口
- **AND** 刷新成功后 MUST 展示新的主简报正文
- **AND** 刷新失败时 MUST 保留旧简报展示
