import { DEFAULT_USER_ID } from "../config.js"
import type { IncomingMessage } from "node:http"

/**
 * 获取当前请求的用户 ID。
 *
 * MVP 阶段：优先读取请求头 `X-User-Id`，未提供时返回固定值 `local_admin`。
 * SaaS 阶段：此处替换为 JWT 解析 / Session 验证逻辑。
 */
export function getCurrentUser(request?: IncomingMessage): string {
  if (request) {
    const header = request.headers["x-user-id"]
    if (typeof header === "string" && header.trim().length > 0) {
      return header.trim()
    }
  }
  return DEFAULT_USER_ID
}
