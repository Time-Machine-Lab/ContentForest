/**
 * MCP 生成器工具定义与 Handler 实现
 *
 * 工具列表：
 *   get_generator          — 返回生成器元数据和当前用户 skillPath
 *   list_generators        — 返回用户已安装生成器列表
 *   install_generator      — 安装生成器并返回 skillPath
 *   write_generation_log   — 写入生成日志
 *   get_nutrients          — 读取营养库 Markdown 文件
 *
 * 宪法 1.3：Handler 只调用 Service，不直接操作存储。
 * 宪法 1.6：userId 从工具参数中获取，保证数据隔离。
 */

import { z } from "zod"
import fs from "node:fs/promises"
import path from "node:path"
import type { GeneratorService } from "../services/generator-service.js"
import { CF_DATA_ROOT } from "../config.js"

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const GetGeneratorSchema = z.object({
  generatorId: z.string().min(1, "generatorId is required"),
  userId: z.string().optional(),
})

export const ListGeneratorsSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  filter: z.object({
    platform: z.enum(["xiaohongshu", "douyin", "twitter", "wechat", "other"]).optional(),
    domain: z.string().optional(),
    keyword: z.string().optional(),
  }).optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
})

export const InstallGeneratorSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  generatorId: z.string().min(1, "generatorId is required"),
})

export const WriteGenerationLogSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  generatorId: z.string().min(1, "generatorId is required"),
  seedId: z.string().optional(),
  fruitId: z.string().optional(),
  input: z.record(z.unknown()).optional().default({}),
  output: z.string().min(1, "output is required"),
  status: z.enum(["success", "failed"]).default("success"),
  error: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional().default(0),
})

export const GetNutrientsSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  paths: z.array(z.string().min(1)).min(1, "at least one path is required"),
})

// ---------------------------------------------------------------------------
// Handler 工厂
// ---------------------------------------------------------------------------

export function createGeneratorToolHandlers(service: GeneratorService) {
  return {
    /** 获取生成器元数据 + 用户本地 skillPath */
    async get_generator(args: unknown) {
      const { generatorId, userId } = GetGeneratorSchema.parse(args)
      const meta = await service.getGenerator(generatorId, userId)
      let skillPath: string | null = null
      if (userId) {
        const record = await service.getInstallRecord(userId, generatorId)
        skillPath = record?.skillPath ?? null
      }
      return { ...meta, skillPath }
    },

    /** 列出用户已安装生成器 */
    async list_generators(args: unknown) {
      const { userId, filter, page, pageSize } = ListGeneratorsSchema.parse(args)
      const result = await service.listMine(userId, page, pageSize)
      // 可选：内存过滤 platform/domain/keyword
      let list = result.list
      if (filter?.platform) list = list.filter(g => g.platform === filter.platform)
      if (filter?.domain) list = list.filter(g => g.domain === filter.domain)
      if (filter?.keyword) {
        const kw = filter.keyword.toLowerCase()
        list = list.filter(g =>
          g.name?.toLowerCase().includes(kw) ||
          g.description?.toLowerCase().includes(kw)
        )
      }
      return { ...result, list }
    },

    /** 安装生成器，返回 skillPath */
    async install_generator(args: unknown) {
      const { userId, generatorId } = InstallGeneratorSchema.parse(args)
      const record = await service.install(userId, generatorId)
      return { generatorId, userId, skillPath: record.skillPath, installedAt: record.installedAt }
    },

    /** 写入生成日志（Redis + 文件双写） */
    async write_generation_log(args: unknown) {
      const dto = WriteGenerationLogSchema.parse(args)
      const log = await service.writeLog(dto.userId, {
        generatorId: dto.generatorId,
        seedId: dto.seedId,
        fruitId: dto.fruitId,
        input: dto.input,
        output: dto.output,
        status: dto.status,
        error: dto.error,
        durationMs: dto.durationMs,
      })
      return { logId: log.id, createdAt: log.createdAt }
    },

    /** 读取营养库 Markdown 文件 */
    async get_nutrients(args: unknown) {
      const { userId, paths } = GetNutrientsSchema.parse(args)
      const results: Array<{ path: string; content: string | null; warning?: string }> = []

      for (const relPath of paths) {
        // 安全校验：禁止路径穿越
        const normalized = path.normalize(relPath)
        if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
          results.push({ path: relPath, content: null, warning: `Invalid path: ${relPath}` })
          continue
        }
        const fullPath = path.join(CF_DATA_ROOT, userId, "nutrients", normalized)
        try {
          const content = await fs.readFile(fullPath, "utf-8")
          results.push({ path: relPath, content })
        } catch (err: unknown) {
          const isNotFound = err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT"
          results.push({
            path: relPath,
            content: null,
            warning: isNotFound ? `File not found: ${relPath}` : `Read error: ${String(err)}`,
          })
        }
      }

      return { results }
    },
  }
}
