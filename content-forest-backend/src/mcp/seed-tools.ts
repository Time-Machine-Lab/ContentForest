/**
 * MCP 种子工具定义与 Handler 实现
 *
 * 工具列表：
 *   save_draft        — 保存草稿（创建或 upsert）
 *   publish_seed      — 发布种子（变为 active）
 *   archive_seed      — 归档种子
 *   list_seeds        — 查询种子列表
 *   get_seed          — 获取种子详情（含 content）
 *   update_seed_info  — 更新种子内容信息（不含状态）
 *
 * 宪法合规：
 * - 1.3 Handler 只调用 SeedService，不直接操作存储
 * - 1.5 Agent 通过 MCP 协议访问，业务逻辑在 SeedService
 * - 1.6 userId 固定走 getCurrentUser()，保证数据隔离
 */

import { z } from "zod"
import type { SeedService } from "../services/seed-service.js"
import { SeedStatus } from "../domain/seed.js"
import { getCurrentUser } from "../middleware/user-context.js"

// ---------------------------------------------------------------------------
// Schema 定义 (7.1)
// ---------------------------------------------------------------------------

export const SaveDraftSchema = z.object({
  title: z.string().min(1, "title is required"),
  content: z.string().min(1, "content is required"),
  tags: z.array(z.string()).optional(),
  id: z.string().optional(),
})

export const PublishSeedSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  id: z.string().optional(),
})

export const ArchiveSeedSchema = z.object({
  seedId: z.string().min(1, "seedId is required"),
})

export const ListSeedsSchema = z.object({
  status: z.nativeEnum(SeedStatus).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().positive().optional().default(1),
  size: z.number().int().positive().max(100).optional().default(20),
})

export const GetSeedSchema = z.object({
  seedId: z.string().min(1, "seedId is required"),
})

export const UpdateSeedInfoSchema = z.object({
  seedId: z.string().min(1, "seedId is required"),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// ---------------------------------------------------------------------------
// Handler 实现工厂 (7.2)
// ---------------------------------------------------------------------------

export function createSeedToolHandlers(service: SeedService) {
  const userId = getCurrentUser()

  return {
    /** 保存草稿 */
    async save_draft(args: unknown) {
      const dto = SaveDraftSchema.parse(args)
      const seed = await service.create(userId, dto)
      return { id: seed.id, status: seed.status }
    },

    /** 发布种子 */
    async publish_seed(args: unknown) {
      const dto = PublishSeedSchema.parse(args)
      if (dto.id) {
        const seed = await service.publish(userId, dto.id)
        return { id: seed.id, status: seed.status }
      }
      if (!dto.title || !dto.content) {
        throw new Error("title and content are required when id is not provided")
      }
      const draft = await service.create(userId, {
        title: dto.title,
        content: dto.content,
        tags: dto.tags,
      })
      const seed = await service.publish(userId, draft.id)
      return { id: seed.id, status: seed.status }
    },

    /** 归档种子 */
    async archive_seed(args: unknown) {
      const { seedId } = ArchiveSeedSchema.parse(args)
      const seed = await service.archive(userId, seedId)
      return { id: seed.id, status: seed.status }
    },

    /** 查询种子列表 */
    async list_seeds(args: unknown) {
      const { status, tags, page, size } = ListSeedsSchema.parse(args)
      const result = await service.list(
        userId,
        { status, tags },
        { page, size }
      )
      return result
    },

    /** 获取种子详情（含 content） */
    async get_seed(args: unknown) {
      const { seedId } = GetSeedSchema.parse(args)
      const seed = await service.findById(userId, seedId)
      return seed
    },

    /** 更新种子内容信息（不含状态） */
    async update_seed_info(args: unknown) {
      const { seedId, title, content, tags } = UpdateSeedInfoSchema.parse(args)
      const seed = await service.update(userId, seedId, { title, content, tags })
      return { id: seed.id, status: seed.status, updatedAt: seed.updatedAt }
    },
  }
}
