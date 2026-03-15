# Proposal: Landing Page Integrations

## 变更概述

内容森林落地页（`content-forest-front`）已完成 UI 框架搭建，现需接入真实功能：
- Waitlist 邮件收集后端
- 演示页面展示种子→果实流程
- SEO / OG 图片 / 社媒分享优化
- 移动端响应式细化

## 背景与动机

落地页目前为纯静态展示，CTA 表单（Request Access）提交后仅打印到控制台，
没有真实收集用户邮件。产品处于 MVP 内测阶段，需要尽快建立候补用户池。

同时，落地页缺少可交互的 Demo 体验，访客无法直观感受"种子→果实"的生成过程。

## 目标

1. **Waitlist 功能上线**：用户提交邮件后真实入库，支持后续定向触达
2. **Demo 页面**：可视化展示一次完整的内容生成流程（模拟数据）
3. **SEO 基础**：OG 图片、结构化数据、sitemap
4. **移动端打磨**：确保 375px 断点下所有 section 可用

## 范围

**In scope:**
- `/api/waitlist` 接口（Nuxt server route）
- 本地 JSON 文件存储 waitlist 邮件（MVP 方案）
- `/demo` 页面（静态模拟数据，无需真实 LLM 调用）
- OG meta tags + og:image 静态图
- 移动端样式修复

**Out of scope:**
- 真实 LLM 接入 Demo 页面
- 第三方邮件服务（Resend/Mailchimp）集成（Phase 2）
- 用户认证系统
