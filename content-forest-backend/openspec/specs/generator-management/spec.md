## Purpose

定义生成器 Skill 的 zip 导入、合法性校验、启用/停用、重新上传、列表详情、内容位置边界和枝化生长选择支撑能力。

## Requirements

### Requirement: 导入生成器 Skill
系统 SHALL 允许用户通过 zip 导入生成器 Skill，并在导入时补充生成器名称和描述。系统 MUST 将合法 Skill 本体保存到运行时文件系统的生成器内容目录，并在数据库中维护生成器系统事实和相对内容位置。

#### Scenario: 成功导入合法生成器
- **WHEN** 用户上传包含 `SKILL.md` 的生成器 zip 并提交名称和描述
- **THEN** 系统 MUST 解压并保存生成器 Skill 本体到运行时生成器内容目录
- **AND** 系统 MUST 创建生成器系统事实记录
- **AND** 系统 MUST 只保存生成器 Skill 本体的相对内容位置
- **AND** 系统 MUST 将新导入的生成器标记为启用状态

#### Scenario: 拒绝缺少名称或描述的导入
- **WHEN** 用户上传生成器 zip 但未提交名称或描述
- **THEN** 系统 MUST 拒绝导入
- **AND** 系统 MUST 返回可被前端感知的校验失败信息

#### Scenario: 拒绝缺少 SKILL.md 的导入
- **WHEN** 用户上传的生成器 zip 解压后不包含可读取的 `SKILL.md`
- **THEN** 系统 MUST 拒绝导入
- **AND** 系统 MUST 不创建可用的生成器系统事实记录

#### Scenario: 拒绝非法 zip
- **WHEN** 用户上传的文件不是可读取的 zip 或解压过程失败
- **THEN** 系统 MUST 拒绝导入
- **AND** 系统 MUST 返回可被前端感知的内容访问失败信息

### Requirement: 保护生成器 Skill 内容边界
系统 SHALL 通过内容访问层保存、读取和替换生成器 Skill 本体。业务模块 MUST NOT 直接访问本地文件系统路径，数据库 MUST NOT 保存本机绝对路径。

#### Scenario: 保存生成器内容位置
- **WHEN** 系统保存生成器 Skill 本体
- **THEN** 系统 MUST 通过内容访问层生成和返回相对内容位置
- **AND** 系统 MUST 在数据库系统事实中保存相对内容位置
- **AND** 系统 MUST NOT 在数据库中保存本机绝对路径

#### Scenario: 拒绝越界路径内容
- **WHEN** 生成器 zip 中包含试图写入运行时内容根目录之外的路径
- **THEN** 系统 MUST 拒绝保存该生成器 Skill 本体
- **AND** 系统 MUST 不读取或写入运行时内容根目录之外的文件

### Requirement: 查看生成器列表与详情
系统 SHALL 提供生成器列表和详情能力，使用户可以查看已导入生成器的系统事实和 Skill 本体可读信息。停用生成器 MUST 仍可查看。

#### Scenario: 查看生成器列表
- **WHEN** 用户请求查看生成器列表
- **THEN** 系统 MUST 返回已导入生成器的列表信息
- **AND** 系统 MUST 能区分启用和停用生成器

#### Scenario: 查看启用生成器详情
- **WHEN** 用户请求查看一个启用生成器详情
- **THEN** 系统 MUST 返回该生成器的系统事实信息
- **AND** 系统 MUST 能通过内容访问层读取该生成器 Skill 本体的可展示信息

#### Scenario: 查看停用生成器详情
- **WHEN** 用户请求查看一个停用生成器详情
- **THEN** 系统 MUST 返回该生成器的系统事实信息
- **AND** 系统 MUST NOT 因生成器已停用而拒绝详情查看

#### Scenario: 查看不存在的生成器
- **WHEN** 用户请求查看不存在的生成器
- **THEN** 系统 MUST 返回可被前端感知的资源不存在信息

### Requirement: 启用与停用生成器
系统 SHALL 允许用户启用或停用生成器。停用生成器 MUST 不可被新的枝化生长选择，但 MUST 保留身份、内容位置和历史追溯关系。

#### Scenario: 停用生成器
- **WHEN** 用户停用一个启用生成器
- **THEN** 系统 MUST 将该生成器标记为停用状态
- **AND** 系统 MUST 保留该生成器的系统事实和内容位置
- **AND** 系统 MUST 使该生成器不再出现在新的枝化生长可选生成器列表中

#### Scenario: 启用生成器
- **WHEN** 用户启用一个停用生成器
- **THEN** 系统 MUST 将该生成器标记为启用状态
- **AND** 系统 MUST 允许该生成器重新出现在新的枝化生长可选生成器列表中

#### Scenario: 停用不破坏历史追溯
- **WHEN** 已被历史生长任务或历史果实引用的生成器被停用
- **THEN** 系统 MUST 保留历史记录对该生成器的追溯能力
- **AND** 系统 MUST NOT 因停用而删除生成器系统事实或 Skill 本体位置

### Requirement: 重新上传生成器 Skill
系统 SHALL 允许用户通过重新上传 zip 替换一个已存在生成器的 Skill 本体。重新上传 MUST 保持生成器作为同一个受管理资源存在，并 MUST 校验新 Skill 本体包含可读取的 `SKILL.md`。

#### Scenario: 成功重新上传生成器
- **WHEN** 用户为已存在生成器重新上传包含 `SKILL.md` 的 zip
- **THEN** 系统 MUST 替换该生成器后续使用的 Skill 本体
- **AND** 系统 MUST 保持该生成器的受管理资源身份不变
- **AND** 系统 MUST 更新该生成器的内容位置或内容本体引用

#### Scenario: 拒绝缺少 SKILL.md 的重新上传
- **WHEN** 用户重新上传的 zip 解压后不包含可读取的 `SKILL.md`
- **THEN** 系统 MUST 拒绝替换当前生成器 Skill 本体
- **AND** 系统 MUST 保持原生成器 Skill 本体仍可用于读取

#### Scenario: 重新上传不承诺完整版本恢复
- **WHEN** 用户重新上传生成器 Skill 本体
- **THEN** 系统 MUST 保留生成器身份和历史追溯关系
- **AND** 系统 MUST NOT 要求第一期提供任意旧版本 Skill 本体恢复能力

### Requirement: 为枝化生长提供可选生成器
系统 SHALL 为枝化生长领域提供可选生成器查询能力。该能力 MUST 只返回启用生成器，并 MUST 提供枝化生长读取 Skill 本体所需的内容访问依据。

#### Scenario: 查询可选生成器
- **WHEN** 枝化生长领域请求可选生成器
- **THEN** 系统 MUST 只返回启用状态的生成器
- **AND** 系统 MUST NOT 返回停用生成器作为可选生成器

#### Scenario: 提供 Skill 读取依据
- **WHEN** 枝化生长领域选择一个启用生成器用于新的生长流程
- **THEN** 系统 MUST 能提供该生成器 Skill 本体的相对内容位置或等价读取依据
- **AND** 系统 MUST 允许枝化生长领域通过内容访问层读取该 Skill 本体

#### Scenario: 不在生成器领域强制生长规则
- **WHEN** 枝化生长领域发起新的生长流程
- **THEN** 生成器领域 MUST NOT 负责判断“枝化生长是否必须选择生成器”
- **AND** 生成器领域 MUST 只负责提供生成器可用性和读取依据

### Requirement: 保持生成器契约边界
系统 SHALL 保持生成器作为外部 Skill 的独立性。系统 MUST NOT 要求生成器包含内容森林专用 manifest，MUST NOT 校验生成器输出结构，MUST NOT 在生成器领域执行 Agent 或生成果实。

#### Scenario: 导入没有 generator.json 的生成器
- **WHEN** 用户上传的生成器 Skill 包含 `SKILL.md` 但不包含 `generator.json`
- **THEN** 系统 MUST 允许导入该生成器
- **AND** 系统 MUST NOT 因缺少内容森林专用 manifest 而拒绝导入

#### Scenario: 不校验生成器输出
- **WHEN** 生成器被后续流程作为内容创作方法论使用
- **THEN** 生成器领域 MUST NOT 要求生成器输出统一结构
- **AND** 生成器领域 MUST NOT 判断生成器输出的内容类型

#### Scenario: 不执行 Agent
- **WHEN** 用户管理生成器或查询可选生成器
- **THEN** 生成器领域 MUST NOT 调用 Agent
- **AND** 生成器领域 MUST NOT 生成果实、封装果实或提取基因标签

### Requirement: 生成器 API 与 SQL 契约先行
系统 SHALL 在实现生成器模块前建立顶层 API 与 SQL 契约文档。涉及生成器接口的契约 MUST 落到 `docs/api/` 下单一生成器 Controller 对应的 `.yaml` 文件；涉及生成器系统事实的存储结构 MUST 落到 `docs/sql/` 下对应生成器表结构 `.sql` 文件。

#### Scenario: 实现生成器接口前存在 API 契约
- **WHEN** 开发者开始实现生成器导入、列表、详情、启用、停用、重新上传或可选生成器查询接口
- **THEN** 系统 MUST 已存在对应生成器 Controller 的 OpenAPI 契约文档
- **AND** 该契约文档 MUST 位于 `docs/api/`

#### Scenario: 实现生成器存储前存在 SQL 契约
- **WHEN** 开发者开始实现生成器系统事实持久化
- **THEN** 系统 MUST 已存在对应生成器表结构契约文档
- **AND** 该契约文档 MUST 位于 `docs/sql/`

