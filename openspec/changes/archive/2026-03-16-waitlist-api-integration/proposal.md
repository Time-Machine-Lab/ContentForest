## Why

候补名单表单提交后只是假装成功 — 邮件没有被保存，还会泄露到浏览器控制台。在 MVP 内测阶段，每一个注册邮件都很宝贵，必须真正收集起来。

The waitlist form currently fakes success — emails are never saved and leak to the browser console. During early access, every signup is precious and must actually be collected.

## What Changes

- 新增 Nuxt 服务端路由 `POST /api/waitlist`，接收邮件并持久化到本地 JSON 文件
- `CtaSection.vue` 的 `handleSubmit` 改为真实 API 调用，带 loading 和 error 状态
- 删除泄露用户邮件的 `console.log`
- 表单新增错误提示文案，告知用户提交失败时的情况

## Capabilities

### New Capabilities
- `waitlist-signup`: 接收邮件地址、去重后写入持久化存储，返回成功/失败响应
- `waitlist-form-ux`: 表单提交的 loading、error、success 三态 UI 反馈

### Modified Capabilities
<!-- No existing specs require modification -->

## Impact

- `content-forest-front/components/CtaSection.vue`: 更新 `handleSubmit` 逻辑，新增 `loading` / `error` ref
- `content-forest-front/server/api/waitlist.post.ts`: 新建服务端路由（Nuxt server route）
- `content-forest-front/server/data/waitlist.json`: 新建持久化存储文件（MVP 阶段用本地文件）
