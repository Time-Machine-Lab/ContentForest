## ADDED Requirements

### Requirement: 联网研究必须支持平台证据管线
系统 SHALL 将平台型营养研究组织为“目标规划、平台路由、候选发现、详情补全、覆盖率和质量门控、营养综合”的证据管线。平台证据管线 MUST 优先使用能返回平台原始详情的 Provider，MUST NOT 仅依赖通用搜索候选线索生成营养结论。

#### Scenario: 执行小红书平台证据管线
- **WHEN** 用户请求收集小红书 AI 产品相关帖子
- **THEN** 系统 MUST 先识别目标平台和内容对象
- **AND** 系统 MUST 使用小红书 Provider 先发现候选笔记再读取详情

#### Scenario: 候选发现不足
- **WHEN** 小红书候选发现结果少于目标数量
- **THEN** 系统 MUST 记录候选发现不足的 Trace
- **AND** 系统 MUST 允许 coverage gate 触发 Codex external research 扩展关键词或补充候选线索

### Requirement: 小红书详情补全必须先于营养综合
系统 SHALL 在营养综合前对小红书候选笔记执行详情补全。未经过详情补全的候选线索 MUST NOT 作为完整平台案例进入营养综合。

#### Scenario: 详情补全成功
- **WHEN** 候选小红书笔记可以通过 xiaohongshu-cli 读取详情
- **THEN** 系统 MUST 将详情数据加入统一研究结果
- **AND** 系统 MUST 基于补全后的结果计算证据完整度

#### Scenario: 详情补全失败
- **WHEN** 候选小红书笔记无法读取详情
- **THEN** 系统 MUST 保留该候选项的受限或失败原因
- **AND** 系统 MUST NOT 将其升级为完整已观察案例

### Requirement: 覆盖率和质量门控必须决定是否启用 Codex 深研
系统 SHALL 在确定性平台采集后执行覆盖率和质量门控。只有当结果不足、平台 Provider 不可用、用户需求宽泛或需要归纳分析时，系统 MUST 启用 Codex external research 作为补盲或深研层。

#### Scenario: 小红书实采结果足够
- **WHEN** xiaohongshu-cli 返回不少于目标数量的完整已观察案例
- **THEN** 系统 MUST 直接进入营养综合
- **AND** 系统 MUST NOT 为同一事实采集任务额外调用 Codex 补充平台帖子数据

#### Scenario: 小红书实采结果不足
- **WHEN** xiaohongshu-cli 返回的完整已观察案例少于目标数量
- **THEN** 系统 MUST 记录不足原因
- **AND** 系统 MAY 调用 Codex external research 扩展关键词、补充背景或提供候选线索

### Requirement: 小红书证据管线 Trace 必须可诊断
系统 SHALL 为小红书证据管线记录可诊断 Trace。Trace MUST 表达查询规划、CLI 健康检查、搜索命令摘要、详情读取数量、完整案例数量、受限状态、Codex 是否触发和最终质量摘要，MUST NOT 泄露 Cookie、本地绝对路径或完整 stderr。

#### Scenario: 记录成功采集 Trace
- **WHEN** 小红书证据管线成功完成
- **THEN** Trace MUST 包含搜索数量、详情补全数量和完整已观察案例数量
- **AND** Trace MUST 能说明是否触发 Codex 深研

#### Scenario: 记录受限采集 Trace
- **WHEN** 小红书证据管线因登录、验证码、IP 限制或 CLI 错误受限
- **THEN** Trace MUST 包含脱敏受限原因
- **AND** Trace MUST NOT 包含 Cookie、浏览器 Profile 路径或完整本地错误输出

## REMOVED Requirements

### Requirement: 小红书研究必须默认使用 Browser Action 深入探索
**Reason**: 小红书 DOM、登录态和 IP 风控维护成本高，默认浏览器探索不适合作为小红书营养研究事实采集路径。
**Migration**: 小红书默认迁移到 xiaohongshu-cli Provider；Browser Action 仅可作为未来显式调试或人工验证能力。

### Requirement: 小红书研究必须默认依赖通用搜索 API 候选线索
**Reason**: 通用搜索 API 返回的是候选网页，不足以满足帖子详情和互动数据采集验收。
**Migration**: 小红书研究先走 xiaohongshu-cli 搜索和详情补全；通用搜索 Provider 从默认链路移除。
