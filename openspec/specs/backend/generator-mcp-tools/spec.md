## Purpose

将生成器能力以 MCP 工具的形式对外暴露，使 AI 智能体可通过标准 MCP 协议调用生成器。

## Requirements

### Requirement: 生成器 MCP 工具注册

将生成器能力以 MCP 工具的形式对外暴露，使 AI 智能体可通过标准 MCP 协议调用生成器。

#### Scenario: 注册生成器工具
- **WHEN** 系统启动或生成器列表发生变更
- **THEN** 将所有已激活的生成器注册为 MCP 工具
- **AND** 每个工具的 `name` 取自生成器的唯一标识，`description` 取自生成器的描述信息
- **AND** 工具的输入 schema 与生成器的参数 schema 保持一致

#### Scenario: 通过 MCP 调用生成器
- **WHEN** MCP 客户端调用某个生成器工具，并传入符合 schema 的参数
- **THEN** 系统执行对应生成器的生成逻辑
- **AND** 将生成结果以 MCP 工具响应格式返回
- **AND** 若生成失败，则在响应中返回结构化的错误信息

### Requirement: MCP 工具权限校验

通过 MCP 调用生成器时，需进行权限验证。

#### Scenario: 已授权用户调用工具
- **WHEN** 携带有效 API 密钥的 MCP 客户端发起工具调用
- **THEN** 系统验证密钥对应用户是否有权使用该生成器
- **AND** 验证通过后执行生成逻辑

#### Scenario: 未授权用户调用工具
- **WHEN** MCP 客户端使用无效或过期的 API 密钥发起调用
- **THEN** 返回 MCP 错误响应，错误码为 `UNAUTHORIZED`
