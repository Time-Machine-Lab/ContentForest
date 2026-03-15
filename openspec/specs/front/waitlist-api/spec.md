# Spec: Waitlist API

## Purpose

`/api/waitlist` 是落地页 MVP 阶段的邮件收集接口，使用本地 JSON 文件存储，无需第三方服务。

---

## Requirements

### Requirement: 邮件收集接口

`POST /api/waitlist` SHALL 接收邮件地址，校验格式后写入本地存储，并返回标准响应。

#### Scenario: 有效邮件提交
- **WHEN** 客户端发送 `POST /api/waitlist` with `{ email: "user@example.com" }`
- **THEN** 服务端校验邮件格式通过
- **AND** 将 `{ email, joinedAt }` 写入 `server/data/waitlist.json`
- **AND** 返回 `{ success: true, message: "已加入候补名单" }`

#### Scenario: 重复邮件幂等
- **WHEN** 客户端使用已存在的邮件再次提交
- **THEN** 服务端检测到重复，不重复写入
- **AND** 返回 `{ success: true, message: "已在候补名单中" }` with HTTP 200

#### Scenario: 无效邮件格式
- **WHEN** 客户端提交非法邮件格式（如 `"notanemail"`）
- **THEN** 服务端返回 HTTP 400
- **AND** 返回 `{ success: false, message: "邮件格式无效" }`
- **AND** 不写入存储

---

### Requirement: 本地存储

`server/data/waitlist.json` SHALL 作为 MVP 阶段的邮件存储，初始为空数组。

#### Scenario: 初始化
- **WHEN** 项目首次部署
- **THEN** `server/data/waitlist.json` 存在且内容为 `[]`

#### Scenario: 写入格式
- **WHEN** 新邮件写入
- **THEN** 每条记录格式为 `{ "email": string, "joinedAt": ISO8601 string }`
- **AND** 文件保持有效 JSON 数组格式
