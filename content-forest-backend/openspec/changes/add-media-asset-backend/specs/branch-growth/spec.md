## ADDED Requirements

### Requirement: 枝化生长接收媒体引用
系统 SHALL 支持枝化生长请求携带媒体引用。每个媒体引用 MUST 包含媒体资源标识和用途说明，系统 MUST 校验媒体资源存在且在授权范围内。

#### Scenario: 提交媒体引用
- **WHEN** 用户发起枝化生长并引用已上传媒体资源
- **THEN** 系统 MUST 校验该媒体资源可访问
- **AND** 系统 MUST 将媒体引用和用途说明纳入本次生长授权范围
- **AND** 系统 MUST 允许引用规划器将该媒体引用纳入本轮 ReferenceAtom、ReferencePlan 和 planned usage

#### Scenario: 媒体引用不可访问
- **WHEN** 用户提交不存在或不可访问的媒体资源引用
- **THEN** 系统 MUST 拒绝创建生长任务
- **AND** 系统 MUST 不把该媒体引用传递给 AgentPort

#### Scenario: 媒体引用被实际使用
- **WHEN** Agent 在候选果实中声明使用了本轮授权的媒体输入
- **THEN** 系统 MUST 允许 actual reference usage 记录该媒体资源
- **AND** 系统 MUST 只接受本轮授权范围内的媒体资源标识

#### Scenario: 媒体输入不等于媒体输出
- **WHEN** 生成器 Skill 在执行过程中生成新的图片或视频
- **THEN** 系统 MUST 不把该新产物当作本轮已授权媒体引用
- **AND** 该新产物 MUST 通过候选媒体产物接管流程成为正式媒体资源后才能挂载果实

#### Scenario: 视频引用不代表可理解
- **WHEN** 用户在枝化生长中引用视频资源
- **THEN** 系统 MUST 允许该视频作为资源引用进入授权范围
- **AND** 系统 MUST 不承诺当前 Agent 一定能理解视频内容
