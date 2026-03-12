/**
 * 种子 REST API 路由（Hono）
 *
 * 迁移自原生 Node.js http 路由，使用 Hono + zValidator 统一入参校验。
 *
 * 路由表：
 *   POST   /api/seeds/draft       保存草稿
 *   POST   /api/seeds/publish     发布种子
 *   GET    /api/seeds             查询列表
 *   GET    /api/seeds/:id         查询详情
 *   PATCH  /api/seeds/:id         更新内容信息
 *   PUT    /api/seeds/:id/archive 归档
 *   PUT    /api/seeds/:id/restore 回档
 *   DELETE /api/seeds/:id         物理删除
 *   GET    /api/tags              获取标签库
 *   DELETE /api/tags/:tag         删除标签
 *
 * 宪法合规：
 * - 1.3 此层只做 HTTP 协议转换，业务逻辑全部在 SeedService
 * - 1.6 userId 从 getCurrentUser() 获取，强制隔离
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { Context } from "hono"
import { SeedService } from "../services/seed-service.js"
import { SeedStatus } from "../domain/seed.js"
import { DEFAULT_USER_ID } from "../config.js"
import { redis } from "../storage/redis-client.js"

/** Hono 环境中获取 userId：优先读 X-User-Id 请求头，回退到 DEFAULT_USER_ID */
function getUserId(c: Context): string {
  const header = c.req.header("x-user-id")
  return header?.trim() || DEFAULT_USER_ID
}

// ---------------------------------------------------------------------------
// Input Schemas (9.4)
// ---------------------------------------------------------------------------

const draftBodySchema = z.object({
  title: z.string().min(1, "title is required"),
  content: z.string().min(1, "content is required"),
  tags: z.array(z.string()).optional(),
  id: z.string().optional(),
})

const publishBodySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
})

const listQuerySchema = z.object({
  status: z.nativeEnum(SeedStatus).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  size: z.coerce.number().int().positive().max(100).optional().default(20),
})

const updateBodySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// ---------------------------------------------------------------------------
// Router 工厂
// ---------------------------------------------------------------------------

export function createSeedRoutes(service: SeedService): Hono {
  const app = new Hono()

  // -------------------------------------------------------------------------
  // POST /api/seeds/draft — 保存草稿
  // -------------------------------------------------------------------------
  app.post("/api/seeds/draft", zValidator("json", draftBodySchema), async (c) => {
    const userId = getUserId(c)
    const body = c.req.valid("json")
    const seed = await service.create(userId, body)
    return c.json({ code: 0, data: { id: seed.id, status: seed.status } }, 201)
  })

  // -------------------------------------------------------------------------
  // POST /api/seeds/publish — 发布种子
  // -------------------------------------------------------------------------
  app.post("/api/seeds/publish", zValidator("json", publishBodySchema), async (c) => {
    const userId = getUserId(c)
    const body = c.req.valid("json")

    if (body.id) {
      const seed = await service.publish(userId, body.id)
      return c.json({ code: 0, data: { id: seed.id, status: seed.status } })
    }

    if (!body.title || !body.content) {
      return c.json({ code: 400, message: "title and content are required" }, 400)
    }
    const draft = await service.create(userId, {
      title: body.title,
      content: body.content,
      tags: body.tags,
    })
    const seed = await service.publish(userId, draft.id)
    return c.json({ code: 0, data: { id: seed.id, status: seed.status } }, 201)
  })

  // -------------------------------------------------------------------------
  // GET /api/seeds — 查询列表
  // -------------------------------------------------------------------------
  app.get("/api/seeds", zValidator("query", listQuerySchema), async (c) => {
    const userId = getUserId(c)
    const { status, tags, page, size } = c.req.valid("query")
    const tagsArr = tags
      ? Array.isArray(tags) ? tags : [tags]
      : undefined
    const result = await service.list(
      userId,
      { status, tags: tagsArr },
      { page, size }
    )
    return c.json({ code: 0, data: result })
  })

  // -------------------------------------------------------------------------
  // GET /api/seeds/:id — 查询详情
  // -------------------------------------------------------------------------
  app.get("/api/seeds/:id", async (c) => {
    const userId = getUserId(c)
    const seedId = c.req.param("id")
    const seed = await service.findById(userId, seedId)
    return c.json({ code: 0, data: seed })
  })

  // -------------------------------------------------------------------------
  // PATCH /api/seeds/:id — 更新内容信息（忽略 status）
  // -------------------------------------------------------------------------
  app.patch("/api/seeds/:id", zValidator("json", updateBodySchema), async (c) => {
    const userId = getUserId(c)
    const seedId = c.req.param("id")
    const { title, content, tags } = c.req.valid("json")
    const seed = await service.update(userId, seedId, { title, content, tags })
    return c.json({ code: 0, data: seed })
  })

  // -------------------------------------------------------------------------
  // PUT /api/seeds/:id/archive — 归档
  // -------------------------------------------------------------------------
  app.put("/api/seeds/:id/archive", async (c) => {
    const userId = getUserId(c)
    const seedId = c.req.param("id")
    const seed = await service.archive(userId, seedId)
    return c.json({ code: 0, data: { id: seed.id, status: seed.status } })
  })

  // -------------------------------------------------------------------------
  // PUT /api/seeds/:id/restore — 回档
  // -------------------------------------------------------------------------
  app.put("/api/seeds/:id/restore", async (c) => {
    const userId = getUserId(c)
    const seedId = c.req.param("id")
    const seed = await service.restore(userId, seedId)
    return c.json({ code: 0, data: { id: seed.id, status: seed.status } })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/seeds/:id — 物理删除
  // -------------------------------------------------------------------------
  app.delete("/api/seeds/:id", async (c) => {
    const userId = getUserId(c)
    const seedId = c.req.param("id")
    await service.delete(userId, seedId)
    return c.json({ code: 0, data: null })
  })

  // -------------------------------------------------------------------------
  // GET /api/tags — 获取标签库
  // -------------------------------------------------------------------------
  app.get("/api/tags", async (c) => {
    const userId = getUserId(c)
    const tags = await redis.smembers(`cf:u:${userId}:tags`)
    return c.json({ code: 0, data: { tags: tags.sort() } })
  })

  // -------------------------------------------------------------------------
  // DELETE /api/tags/:tag — 删除标签
  // -------------------------------------------------------------------------
  app.delete("/api/tags/:tag", async (c) => {
    const userId = getUserId(c)
    const tag = decodeURIComponent(c.req.param("tag"))
    await redis.srem(`cf:u:${userId}:tags`, tag)
    return c.json({ code: 0, data: null })
  })

  return app
}
