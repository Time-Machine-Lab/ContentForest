/**
 * 种子 REST API 路由处理器
 *
 * 路由表：
 *   POST   /api/seeds/draft       保存草稿（创建或 upsert）
 *   POST   /api/seeds/publish     发布种子（直接 active 或将草稿发布）
 *   GET    /api/seeds             查询列表（分页 + 过滤）
 *   GET    /api/seeds/:id         查询详情
 *   PATCH  /api/seeds/:id         更新内容信息（title/content/tags）
 *   PUT    /api/seeds/:id/archive 归档
 *   PUT    /api/seeds/:id/restore 回档
 *   DELETE /api/seeds/:id         物理删除
 *   GET    /api/tags              获取标签库
 *
 * 宪法合规：
 * - 1.3 此层只做 HTTP 协议转换，业务逻辑全部在 SeedService
 * - 1.6 userId 从 getCurrentUser() 获取，强制隔离
 */

import type { IncomingMessage, ServerResponse } from "node:http"
import { SeedService, SeedNotFoundError, InvalidTransitionError } from "../services/seed-service.js"
import { SeedStatus } from "../domain/seed.js"
import { getCurrentUser } from "../middleware/user-context.js"
import { redis } from "../storage/redis-client.js"

// ---------------------------------------------------------------------------
// HTTP 工具
// ---------------------------------------------------------------------------

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status
  res.setHeader("content-type", "application/json; charset=utf-8")
  res.end(JSON.stringify(payload))
}

function ok(res: ServerResponse, data: unknown): void {
  sendJson(res, 200, { code: 0, data })
}

function created(res: ServerResponse, data: unknown): void {
  sendJson(res, 201, { code: 0, data })
}

function badRequest(res: ServerResponse, message: string): void {
  sendJson(res, 400, { code: 400, message })
}

function notFound(res: ServerResponse, message = "Not Found"): void {
  sendJson(res, 404, { code: 404, message })
}

function serverError(res: ServerResponse, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  sendJson(res, 500, { code: 500, message })
}

/** 读取请求体 JSON */
async function readBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on("data", (chunk: Buffer) => chunks.push(chunk))
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf-8")
        resolve(text ? (JSON.parse(text) as T) : ({} as T))
      } catch {
        reject(new Error("Invalid JSON body"))
      }
    })
    req.on("error", reject)
  })
}

// ---------------------------------------------------------------------------
// 路由处理器工厂
// ---------------------------------------------------------------------------

export function createSeedRouter(service: SeedService) {
  return async function handleSeedRoute(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string
  ): Promise<boolean> {
    const method = req.method ?? ""
    const userId = getCurrentUser(req)

    try {
      // -----------------------------------------------------------------------
      // 6.2 POST /api/seeds/draft — 保存草稿
      // -----------------------------------------------------------------------
      if (method === "POST" && pathname === "/api/seeds/draft") {
        const body = await readBody<{ title?: string; content?: string; tags?: string[]; id?: string }>(req)
        if (!body.title || !body.content) {
          badRequest(res, "title and content are required")
          return true
        }
        const seed = await service.create(userId, {
          title: body.title,
          content: body.content,
          tags: body.tags,
          id: body.id,
        })
        created(res, { id: seed.id, status: seed.status })
        return true
      }

      // -----------------------------------------------------------------------
      // POST /api/seeds/publish — 发布种子
      // -----------------------------------------------------------------------
      if (method === "POST" && pathname === "/api/seeds/publish") {
        const body = await readBody<{ title?: string; content?: string; tags?: string[]; id?: string }>(req)

        if (body.id) {
          // 发布已有草稿
          const seed = await service.publish(userId, body.id)
          ok(res, { id: seed.id, status: seed.status })
        } else {
          // 直接创建 active 种子
          if (!body.title || !body.content) {
            badRequest(res, "title and content are required")
            return true
          }
          const draft = await service.create(userId, {
            title: body.title,
            content: body.content,
            tags: body.tags,
          })
          const seed = await service.publish(userId, draft.id)
          created(res, { id: seed.id, status: seed.status })
        }
        return true
      }

      // -----------------------------------------------------------------------
      // 6.3 GET /api/seeds — 查询列表
      // -----------------------------------------------------------------------
      if (method === "GET" && pathname === "/api/seeds") {
        const qs = new URL(req.url ?? "/", "http://localhost").searchParams
        const status = qs.get("status") as SeedStatus | null
        const tags = qs.getAll("tags")
        const page = Math.max(1, Number(qs.get("page") ?? 1))
        const size = Math.min(100, Math.max(1, Number(qs.get("size") ?? 20)))

        const result = await service.list(
          userId,
          { status: status ?? undefined, tags: tags.length ? tags : undefined },
          { page, size }
        )
        ok(res, result)
        return true
      }

      // -----------------------------------------------------------------------
      // 6.4 GET /api/seeds/:id — 查询详情
      // -----------------------------------------------------------------------
      const detailMatch = pathname.match(/^\/api\/seeds\/([^\/]+)$/)
      if (method === "GET" && detailMatch) {
        const seedId = detailMatch[1]
        const seed = await service.findById(userId, seedId)
        ok(res, seed)
        return true
      }

      // -----------------------------------------------------------------------
      // 6.5 PATCH /api/seeds/:id — 更新内容信息
      // -----------------------------------------------------------------------
      const patchMatch = pathname.match(/^\/api\/seeds\/([^\/]+)$/)
      if (method === "PATCH" && patchMatch) {
        const seedId = patchMatch[1]
        const body = await readBody<{ title?: string; content?: string; tags?: string[] }>(req)
        // 忽略 status 字段（宪法 1.3：状态流转走专用接口）
        const { title, content, tags } = body
        const seed = await service.update(userId, seedId, { title, content, tags })
        ok(res, seed)
        return true
      }

      // -----------------------------------------------------------------------
      // PUT /api/seeds/:id/archive — 归档
      // -----------------------------------------------------------------------
      const archiveMatch = pathname.match(/^\/api\/seeds\/([^\/]+)\/archive$/)
      if (method === "PUT" && archiveMatch) {
        const seedId = archiveMatch[1]
        const seed = await service.archive(userId, seedId)
        ok(res, { id: seed.id, status: seed.status })
        return true
      }

      // -----------------------------------------------------------------------
      // PUT /api/seeds/:id/restore — 回档
      // -----------------------------------------------------------------------
      const restoreMatch = pathname.match(/^\/api\/seeds\/([^\/]+)\/restore$/)
      if (method === "PUT" && restoreMatch) {
        const seedId = restoreMatch[1]
        const seed = await service.restore(userId, seedId)
        ok(res, { id: seed.id, status: seed.status })
        return true
      }

      // -----------------------------------------------------------------------
      // 6.6 DELETE /api/seeds/:id — 物理删除
      // -----------------------------------------------------------------------
      const deleteMatch = pathname.match(/^\/api\/seeds\/([^\/]+)$/)
      if (method === "DELETE" && deleteMatch) {
        const seedId = deleteMatch[1]
        await service.delete(userId, seedId)
        ok(res, null)
        return true
      }

      // -----------------------------------------------------------------------
      // GET /api/tags — 获取标签库
      // -----------------------------------------------------------------------
      if (method === "GET" && pathname === "/api/tags") {
        const tags = await redis.smembers(`cf:u:${userId}:tags`)
        ok(res, { tags: tags.sort() })
        return true
      }

      // -----------------------------------------------------------------------
      // DELETE /api/tags/:tag — 删除标签
      // -----------------------------------------------------------------------
      const deleteTagMatch = pathname.match(/^\/api\/tags\/([^\/]+)$/)
      if (method === "DELETE" && deleteTagMatch) {
        const tag = decodeURIComponent(deleteTagMatch[1])
        await redis.srem(`cf:u:${userId}:tags`, tag)
        ok(res, null)
        return true
      }

      return false // 未匹配，交给上层处理
    } catch (err) {
      if (err instanceof SeedNotFoundError) {
        notFound(res, err.message)
        return true
      }
      if (err instanceof InvalidTransitionError) {
        badRequest(res, err.message)
        return true
      }
      serverError(res, err)
      return true
    }
  }
}
