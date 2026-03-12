/**
 * Hono App — HTTP 请求分发器
 *
 * 职责：
 * - 组装 Hono 应用，挂载种子路由
 * - 全局错误处理中间件（SeedNotFoundError → 404，InvalidTransitionError → 400）
 * - MCP SSE 端点通过 app.use 挂载（/sse, /message）
 * - 导出供 @hono/node-server 使用的 fetch handler
 *
 * 宪法 1.3：此文件只做请求分发和错误映射，不含业务逻辑。
 * 宪法 1.6：X-User-Id 请求头解析在 getCurrentUser() 中统一处理。
 */

import { Hono } from "hono"
import { RedisSeedRepository } from "../repositories/redis-seed-repository.js"
import { SeedService, SeedNotFoundError, InvalidTransitionError } from "../services/seed-service.js"
import { createSeedRoutes } from "./seeds.js"
import { createMcpServer, handleMcpRequest } from "../mcp/server.js"
import type { IncomingMessage, ServerResponse } from "node:http"

// ---------------------------------------------------------------------------
// 单例：Service + MCP Server
// ---------------------------------------------------------------------------

const repo = new RedisSeedRepository()
export const seedService = new SeedService(repo)
export const mcpServer = createMcpServer(seedService)

// ---------------------------------------------------------------------------
// Hono App 组装 (9.2 + 9.5 + 9.6)
// ---------------------------------------------------------------------------

const app = new Hono()

// 健康检查
app.get("/health", (c) => c.json({ status: "ok" }))

// 种子 + 标签路由
const seedRoutes = createSeedRoutes(seedService)
app.route("/", seedRoutes)

// 全局错误处理 (9.5)
app.onError((err, c) => {
  if (err instanceof SeedNotFoundError) {
    return c.json({ code: 404, message: err.message }, 404)
  }
  if (err instanceof InvalidTransitionError) {
    return c.json({ code: 400, message: err.message }, 400)
  }
  process.stderr.write(`[Server] unhandled error: ${err.message}\n`)
  return c.json({ code: 500, message: "Internal Server Error" }, 500)
})

// ---------------------------------------------------------------------------
// MCP SSE 端点 (9.6) — 通过原生 http 适配器旁路挂载
// Hono 不直接支持 SSE 的双向通道，保留原生 IncomingMessage/ServerResponse 处理
// ---------------------------------------------------------------------------

export async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const rawUrl = request.url ?? "/"
  const pathname = rawUrl.split("?")[0]

  // MCP SSE 端点旁路（不走 Hono，保持原生 http 接口）
  if (pathname === "/sse" || pathname === "/message") {
    const matched = await handleMcpRequest(mcpServer, request, response, pathname)
    if (matched) return
  }

  // 其余请求交给 Hono 处理
  const req = new Request(`http://localhost${rawUrl}`, {
    method: request.method ?? "GET",
    headers: Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.join(", ") : (v ?? ""),
      ])
    ),
    body: ["GET", "HEAD"].includes(request.method ?? "GET")
      ? undefined
      : await readStream(request),
  })

  const res = await app.fetch(req)

  response.statusCode = res.status
  res.headers.forEach((value, key) => response.setHeader(key, value))
  const body = await res.arrayBuffer()
  response.end(Buffer.from(body))
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

async function readStream(stream: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
    stream.on("error", reject)
  })
}
