## 1. Server Route

- [x] 1.1 创建 `server/data/` 目录并添加空的 `waitlist.json`（内容为 `[]`）
- [x] 1.2 创建 `server/api/waitlist.post.ts` Nuxt server route
- [x] 1.3 实现邮件格式校验，无效时返回 HTTP 400
- [x] 1.4 实现邮件去重逻辑，重复时返回 `{ success: true, duplicate: true }`
- [x] 1.5 实现写入逻辑，将 `{ email, timestamp }` 追加到 `waitlist.json`
- [x] 1.6 实现错误处理，写入失败时返回 HTTP 500

## 2. 前端表单更新

- [x] 2.1 在 `CtaSection.vue` 中新增 `loading` 和 `error` ref
- [x] 2.2 将 `handleSubmit` 改为使用 `$fetch` 调用 `/api/waitlist`
- [x] 2.3 删除 `console.log('Waitlist signup:', email.value)`
- [x] 2.4 提交中：禁用按钮并显示加载状态文案
- [x] 2.5 成功：设置 `submitted = true`，禁用输入框
- [x] 2.6 失败：设置 `error` 内容，按钮恢复可点击状态

## 3. 错误提示 UI

- [x] 3.1 在表单下方添加错误提示文案区域（仅 `error` 有值时显示）
- [x] 3.2 错误文案样式与设计系统一致（`font-mono text-xs text-red-400`）

## 4. 验证

- [x] 4.1 测试正常提交：邮件出现在 `waitlist.json`
- [x] 4.2 测试重复提交：不写入重复条目，表单仍显示成功
- [x] 4.3 测试无效邮件：表单显示错误提示
- [x] 4.4 确认浏览器控制台无 `console.log` 输出
