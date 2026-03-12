/**
 * Redis 种子仓储实现
 *
 * 实现 SeedRepository 接口，使用 Redis 作为热数据层。
 *
 * Key 设计（宪法 1.6 — 强制 userId 隔离）：
 *   元数据 Hash : cf:u:{userId}:s:{seedId}:meta
 *   列表 ZSet   : cf:u:{userId}:seeds:list   (score = createdAt ms)
 *   标签库 Set  : cf:u:{userId}:tags
 *
 * 宪法 1.3：业务逻辑在 SeedService，此层只负责存储操作。
 */

import type { Redis } from "ioredis"
import { redis as defaultRedis } from "../storage/redis-client.js"
import type { SeedRepository } from "./seed-repository.js"
import { SeedStatus } from "../domain/seed.js"
import type {
  CreateSeedDto,
  PaginatedResult,
  PaginationParams,
  Seed,
  SeedFilter,
  UpdateSeedDto,
} from "../domain/seed.js"

// ---------------------------------------------------------------------------
// Redis Key helpers
// ---------------------------------------------------------------------------

const metaKey = (userId: string, seedId: string) =>
  `cf:u:${userId}:s:${seedId}:meta`

const listKey = (userId: string) =>
  `cf:u:${userId}:seeds:list`

const tagsKey = (userId: string) =>
  `cf:u:${userId}:tags`

// ---------------------------------------------------------------------------
// Hash field ↔ Seed 互转
// ---------------------------------------------------------------------------

type SeedMeta = Omit<Seed, "content">

function toHash(meta: SeedMeta): Record<string, string> {
  return {
    id: meta.id,
    user_id: meta.userId,
    title: meta.title,
    tags: JSON.stringify(meta.tags),
    status: meta.status,
    created_at: String(meta.createdAt),
    updated_at: String(meta.updatedAt),
    fruit_count: String(meta.fruitCount),
  }
}

function fromHash(hash: Record<string, string>): SeedMeta | null {
  if (!hash["id"]) return null
  return {
    id: hash["id"],
    userId: hash["user_id"] ?? "",
    title: hash["title"] ?? "",
    tags: safeParseJson<string[]>(hash["tags"], []),
    status: (hash["status"] as SeedStatus) ?? SeedStatus.Draft,
    createdAt: Number(hash["created_at"] ?? 0),
    updatedAt: Number(hash["updated_at"] ?? 0),
    fruitCount: Number(hash["fruit_count"] ?? 0),
  }
}

function safeParseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class RedisSeedRepository implements SeedRepository {
  constructor(private readonly client: Redis = defaultRedis) {}

  // -------------------------------------------------------------------------
  // 4.3 create
  // -------------------------------------------------------------------------
  async create(
    userId: string,
    dto: CreateSeedDto & { id: string; createdAt: number; updatedAt: number }
  ): Promise<Seed> {
    const meta: SeedMeta = {
      id: dto.id,
      userId,
      title: dto.title,
      tags: dto.tags ?? [],
      status: SeedStatus.Draft,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      fruitCount: 0,
    }

    const pipeline = this.client.pipeline()
    // 写入元数据 Hash
    pipeline.hset(metaKey(userId, dto.id), toHash(meta))
    // 写入列表 ZSet（score = createdAt，天然按时间排序）
    pipeline.zadd(listKey(userId), dto.createdAt, dto.id)
    // 写入标签库
    if (meta.tags.length > 0) {
      pipeline.sadd(tagsKey(userId), ...meta.tags)
    }
    await pipeline.exec()

    return { ...meta, content: dto.content }
  }

  // -------------------------------------------------------------------------
  // 4.4 findById
  // -------------------------------------------------------------------------
  async findById(
    userId: string,
    seedId: string
  ): Promise<Omit<Seed, "content"> | null> {
    const hash = await this.client.hgetall(metaKey(userId, seedId))
    if (!hash || Object.keys(hash).length === 0) return null
    return fromHash(hash)
  }

  // -------------------------------------------------------------------------
  // 4.5 list
  // -------------------------------------------------------------------------
  async list(
    userId: string,
    filter: SeedFilter,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Omit<Seed, "content">>> {
    const { page, size } = pagination

    // 从 ZSet 获取全量 ID（降序 = 最新在前）
    const allIds = await this.client.zrevrange(listKey(userId), 0, -1)
    if (allIds.length === 0) return { list: [], total: 0 }

    // 批量 MGET 所有 Hash
    const pipeline = this.client.pipeline()
    for (const id of allIds) {
      pipeline.hgetall(metaKey(userId, id))
    }
    const results = await pipeline.exec()

    // 解析 + 内存过滤（宪法 1.3：过滤逻辑在应用层，不在 Redis）
    const seeds: SeedMeta[] = []
    if (results) {
      for (const [err, hash] of results) {
        if (err || !hash) continue
        const seed = fromHash(hash as Record<string, string>)
        if (!seed) continue

        // status 过滤
        if (filter.status && seed.status !== filter.status) continue

        // tags 过滤（种子必须包含所有指定标签）
        if (filter.tags && filter.tags.length > 0) {
          const hasAll = filter.tags.every((t) => seed.tags.includes(t))
          if (!hasAll) continue
        }

        seeds.push(seed)
      }
    }

    const total = seeds.length
    const start = (page - 1) * size
    const list = seeds.slice(start, start + size)

    return { list, total }
  }

  // -------------------------------------------------------------------------
  // 4.6 update
  // -------------------------------------------------------------------------
  async update(
    userId: string,
    seedId: string,
    updates: Partial<UpdateSeedDto & { status: string; updatedAt: number; fruitCount: number }>
  ): Promise<void> {
    const fields: Record<string, string> = {}

    if (updates.title !== undefined) fields["title"] = updates.title
    if (updates.tags !== undefined) {
      fields["tags"] = JSON.stringify(updates.tags)
      // 同步更新标签库
      if (updates.tags.length > 0) {
        await this.client.sadd(tagsKey(userId), ...updates.tags)
      }
    }
    if (updates.status !== undefined) fields["status"] = updates.status
    if (updates.updatedAt !== undefined) fields["updated_at"] = String(updates.updatedAt)
    if (updates.fruitCount !== undefined) fields["fruit_count"] = String(updates.fruitCount)

    if (Object.keys(fields).length === 0) return

    const pipeline = this.client.pipeline()
    pipeline.hset(metaKey(userId, seedId), fields)
    await pipeline.exec()
  }

  // -------------------------------------------------------------------------
  // 4.7 delete
  // -------------------------------------------------------------------------
  async delete(userId: string, seedId: string): Promise<void> {
    const pipeline = this.client.pipeline()
    pipeline.del(metaKey(userId, seedId))
    pipeline.zrem(listKey(userId), seedId)
    await pipeline.exec()
  }
}
