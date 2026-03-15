## Context

`CtaSection.vue` 是落地页的核心转化组件。当前 `handleSubmit` 仅翻转 `submitted` 标志位，既不保存邮件也不给出真实反馈。项目栈为 Nuxt 3，天然支持 server routes，无需引入额外后端服务。

The form is the primary conversion point on the landing page. The current handler just flips a flag — no data is saved. The project is Nuxt 3, which has built-in server routes, so no separate backend is needed.

## Goals / Non-Goals

**Goals:**
- 真实保存每一个 waitlist 邮件
- 表单有 loading / success / error 三态反馈
- 去除 `console.log` 泄露
- 零新依赖，纯 Nuxt 内置能力实现

**Non-Goals:**
- 邮件通知 / 自动回复（MVP 后续迭代）
- 后台管理界面查看注册列表
- 接入第三方 waitlist 服务（如 Loops、Beehiiv）
- 数据库持久化（MVP 阶段用本地 JSON 文件足够）

## Decisions

### Decision 1: 用 Nuxt server route 而不是外部 API

Nuxt 3 的 `server/api/` 目录开箱即用，无需额外服务器或 serverless 配置。MVP 阶段部署简单，后续可无缝替换为真实数据库。

- 备选方案：Supabase / PlanetScale — 引入外部依赖，超出 MVP 范围
- 备选方案：直接写 localStorage — 数据不在服务端，无法收集

### Decision 2: 持久化到 `server/data/waitlist.json`

本地 JSON 文件对 MVP 够用：可被 git 追踪、部署后可读、无需数据库。条目格式：`{ email, timestamp, ip? }`。

- 风险：并发写入时可能有竞态。MVP 阶段流量极低，可接受；后续升级时换原子写入或数据库。

### Decision 3: 前端用 `$fetch` 而不是 `axios`

Nuxt 3 内置 `$fetch` (ofetch)，无需额外依赖，支持 SSR/CSR 双模式。

## Risks / Trade-offs

- **并发写入竞态** → MVP 流量低，可接受。后续用 `fs/promises` 加文件锁或换数据库。
- **服务端文件路径** → Nuxt server routes 中用 `useStorage` 或 `process.cwd()` 定位文件，需在 `server/` 目录下运行。
- **邮件无验证码** → 可被批量刷。MVP 阶段加简单 rate limiting 即可（后续任务）。

## Open Questions

- 后续是否接入 Resend / Loops 发送欢迎邮件？（不影响本次实现）
- 是否需要 IP 去重而不只是邮件去重？（当前方案只做邮件去重）
