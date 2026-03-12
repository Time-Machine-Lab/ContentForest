/**
 * HTTP 请求分发器
 *
 * 职责：将请求路由到对应处理器。
 * - /health         健康检查
 * - /api/seeds/*    种子 REST API
 * - /api/tags/*     标签 REST API
 * - /sse, /message  MCP SSE 端点
 *
 * 宪法 1.3：此文件只做请求分发，不含业务逻辑。
 * 宪法 1.6：X-User-Id 请求头解析在 getCurrentUser() 中统一处理。
 */

import type { IncomingMessage, ServerResponse } from "node:http"
import { RedisSeedRepository } from "../repositories/redis-seed-repository.js"
import { SeedService } from "../services/seed-service.js"
import { createSeedRouter } from "./seeds.js"
import { createMcpServer, handleMcpRequest } from "../mcp/server.js"

// ---------------------------------------------------------------------------
// 单例：Service + Router + MCP Server
// ---------------------------------------------------------------------------

const repo = new RedisSeedRepository()
const seedService = new SeedService(repo)
const handleSeedRoute = createSeedRouter(seedService)
const mcpServer = createMcpServer(seedService)

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode
  response.setHeader("content-type", "application/json; charset=utf-8")
  response.end(JSON.stringify(payload))
}

// ---------------------------------------------------------------------------
// 主请求处理器
// ---------------------------------------------------------------------------

export async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const rawUrl = request.url ?? "/"
  const pathname = rawUrl.split("?")[0]

  // 健康检查
  if (request.method === "GET" && pathname === "/health") {
    sendJson(response, 200, { status: "ok" })
    return
  }

  // 种子 + 标签 REST API
  if (pathname.startsWith("/api/seeds") || pathname.startsWith("/api/tags")) {
    const matched = await handleSeedRoute(request, response, pathname)
    if (matched) return
  }

  // MCP SSE 端点
  if (pathname === "/sse" || pathname === "/message") {
    const matched = await handleMcpRequest(mcpServer, request, response, pathname)
    if (matched) return
  }

  sendJson(response, 404, { message: "Not Found" })
}
