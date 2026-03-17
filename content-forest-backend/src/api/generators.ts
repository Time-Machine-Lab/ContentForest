/**
 * 生成器市场 REST API 路由（Hono）
 *
 * GET    /api/generators/market          市场列表
 * GET    /api/generators/market/:id      生成器详情
 * GET    /api/generators/mine            我的已安装列表
 * POST   /api/generators/:id/install     安装
 * POST   /api/generators/upload          上传 Skill zip
 * DELETE /api/generators/:id/uninstall   卸载
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import type { Context } from "hono"
import {
  GeneratorService,
  GeneratorNotFoundError,
  GeneratorAlreadyInstalledError,
  GeneratorNotInstalledError,
  InvalidSkillPackageError,
} from "../services/generator-service.js"

function getUserId(c: Context): string | null {
  return c.req.header("x-user-id")?.trim() || null
}

function authGuard(c: Context): string | null {
  const id = getUserId(c)
  if (!id) { c.json({ code: 401, message: "X-User-Id header is required" }, 401); return null }
  return id
}

const marketQuerySchema = z.object({
  platform: z.enum(["xiaohongshu","douyin","twitter","wechat","other"]).optional(),
  domain: z.string().optional(),
  keyword: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
})

const mineQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
})

export function createGeneratorRoutes(service: GeneratorService): Hono {
  const app = new Hono()

  // GET /api/generators/market
  app.get("/api/generators/market", zValidator("query", marketQuerySchema), async (c) => {
    const userId = getUserId(c) ?? undefined
    const { platform, domain, keyword, tags, page, pageSize } = c.req.valid("query")
    const tagsArr = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined
    const result = await service.listMarket({ platform, domain, keyword, tags: tagsArr, page, pageSize }, userId)
    return c.json({ code: 0, data: result })
  })

  // GET /api/generators/market/:id
  app.get("/api/generators/market/:id", async (c) => {
    const userId = getUserId(c) ?? undefined
    const data = await service.getGenerator(c.req.param("id"), userId)
    return c.json({ code: 0, data })
  })

  // GET /api/generators/mine
  app.get("/api/generators/mine", zValidator("query", mineQuerySchema), async (c) => {
    const userId = getUserId(c)
    if (!userId) return c.json({ code: 401, message: "X-User-Id header is required" }, 401)
    const { page, pageSize } = c.req.valid("query")
    const result = await service.listMine(userId, page, pageSize)
    return c.json({ code: 0, data: result })
  })

  // POST /api/generators/:id/install
  app.post("/api/generators/:id/install", async (c) => {
    const userId = getUserId(c)
    if (!userId) return c.json({ code: 401, message: "X-User-Id header is required" }, 401)
    const record = await service.install(userId, c.req.param("id"))
    return c.json({ code: 0, data: record }, 201)
  })

  // POST /api/generators/upload
  app.post("/api/generators/upload", async (c) => {
    const userId = getUserId(c)
    if (!userId) return c.json({ code: 401, message: "X-User-Id header is required" }, 401)

    const formData = await c.req.formData()
    const name = formData.get("name")
    const description = formData.get("description")
    const platform = formData.get("platform")
    const file = formData.get("file")

    if (!name || !description || !platform || !file) {
      return c.json({ code: 400, message: "name, description, platform, file are required" }, 400)
    }
    if (!(file instanceof File)) {
      return c.json({ code: 400, message: "file must be a zip File" }, 400)
    }
    const validPlatforms = ["xiaohongshu","douyin","twitter","wechat","other"]
    if (!validPlatforms.includes(String(platform))) {
      return c.json({ code: 400, message: `platform must be one of: ${validPlatforms.join(", ")}` }, 400)
    }

    const zipBuffer = Buffer.from(await file.arrayBuffer())
    const safeJson = (raw: FormDataEntryValue | null): string[] => {
      if (!raw) return []
      try { return JSON.parse(String(raw)) } catch { return [] }
    }

    const dto = {
      name: String(name),
      description: String(description),
      platform: String(platform) as "xiaohongshu"|"douyin"|"twitter"|"wechat"|"other",
      domain: String(formData.get("domain") ?? ""),
      contentTypes: safeJson(formData.get("contentTypes")),
      outputCapabilities: safeJson(formData.get("outputCapabilities")),
      tags: safeJson(formData.get("tags")),
      price: Number(formData.get("price") ?? 0),
    }

    const result = await service.upload(userId, dto, zipBuffer)
    return c.json({ code: 0, data: result }, 201)
  })

  // DELETE /api/generators/:id/uninstall
  app.delete("/api/generators/:id/uninstall", async (c) => {
    const userId = getUserId(c)
    if (!userId) return c.json({ code: 401, message: "X-User-Id header is required" }, 401)
    await service.uninstall(userId, c.req.param("id"))
    return c.json({ code: 0, data: null })
  })

  return app
}
