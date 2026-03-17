/**
 * GeneratorRepository — Redis 实现
 *
 * Key 设计：
 *   cf:gen:{genId}:meta      → Hash，生成器元数据
 *   cf:market:gens           → ZSet，市场公开索引（score = updatedAt ms）
 *
 * 宪法 1.3：此层只做数据读写，不含业务逻辑。
 */

import type { Redis } from "ioredis"
import { redis as defaultRedis } from "../storage/redis-client.js"
import type { GeneratorRepository } from "./generator-repository.js"
import type {
  GeneratorMetadata,
  GeneratorPlatform,
  GeneratorVisibility,
} from "../domain/generator.js"

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const metaKey = (genId: string) => `cf:gen:${genId}:meta`
const MARKET_KEY = "cf:market:gens"

// ---------------------------------------------------------------------------
// Hash 序列化 / 反序列化
// ---------------------------------------------------------------------------

function toHash(meta: GeneratorMetadata): Record<string, string> {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    platform: meta.platform,
    content_types: JSON.stringify(meta.contentTypes),
    domain: meta.domain,
    author: meta.author,
    output_capabilities: JSON.stringify(meta.outputCapabilities),
    price: String(meta.price),
    install_count: String(meta.installCount),
    rating: String(meta.rating),
    rating_count: String(meta.ratingCount),
    tags: JSON.stringify(meta.tags),
    visibility: meta.visibility,
    created_at: String(meta.createdAt),
    updated_at: String(meta.updatedAt),
  }
}

function fromHash(hash: Record<string, string>): GeneratorMetadata | null {
  if (!hash["id"]) return null
  return {
    id: hash["id"],
    name: hash["name"] ?? "",
    description: hash["description"] ?? "",
    platform: (hash["platform"] as GeneratorPlatform) ?? "other",
    contentTypes: safeJson<string[]>(hash["content_types"], []),
    domain: hash["domain"] ?? "",
    author: hash["author"] ?? "",
    outputCapabilities: safeJson<string[]>(hash["output_capabilities"], []),
    price: Number(hash["price"] ?? 0),
    installCount: Number(hash["install_count"] ?? 0),
    rating: Number(hash["rating"] ?? 0),
    ratingCount: Number(hash["rating_count"] ?? 0),
    tags: safeJson<string[]>(hash["tags"], []),
    visibility: (hash["visibility"] as GeneratorVisibility) ?? "private",
    createdAt: Number(hash["created_at"] ?? 0),
    updatedAt: Number(hash["updated_at"] ?? 0),
  }
}

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class RedisGeneratorRepository implements GeneratorRepository {
  constructor(private readonly client: Redis = defaultRedis) {}

  async save(meta: GeneratorMetadata): Promise<void> {
    const pipeline = this.client.pipeline()
    pipeline.hset(metaKey(meta.id), toHash(meta))
    if (meta.visibility === "public") {
      pipeline.zadd(MARKET_KEY, meta.updatedAt, meta.id)
    }
    await pipeline.exec()
  }

  async findById(generatorId: string): Promise<GeneratorMetadata | null> {
    const hash = await this.client.hgetall(metaKey(generatorId))
    if (!hash || Object.keys(hash).length === 0) return null
    return fromHash(hash)
  }

  async findByIds(generatorIds: string[]): Promise<GeneratorMetadata[]> {
    if (generatorIds.length === 0) return []
    const pipeline = this.client.pipeline()
    for (const id of generatorIds) {
      pipeline.hgetall(metaKey(id))
    }
    const results = await pipeline.exec()
    const items: GeneratorMetadata[] = []
    if (!results) return items
    for (const [err, hash] of results) {
      if (err || !hash) continue
      const meta = fromHash(hash as Record<string, string>)
      if (meta) items.push(meta)
    }
    return items
  }

  async listMarket(offset: number, limit: number): Promise<[string[], number]> {
    const pipeline = this.client.pipeline()
    pipeline.zrevrange(MARKET_KEY, offset, offset + limit - 1)
    pipeline.zcard(MARKET_KEY)
    const results = await pipeline.exec()
    if (!results) return [[], 0]
    const ids = (results[0]?.[1] as string[]) ?? []
    const total = (results[1]?.[1] as number) ?? 0
    return [ids, total]
  }

  async update(
    generatorId: string,
    fields: Partial<GeneratorMetadata>
  ): Promise<void> {
    const patch: Record<string, string> = {}
    if (fields.name !== undefined) patch["name"] = fields.name
    if (fields.description !== undefined) patch["description"] = fields.description
    if (fields.platform !== undefined) patch["platform"] = fields.platform
    if (fields.contentTypes !== undefined)
      patch["content_types"] = JSON.stringify(fields.contentTypes)
    if (fields.domain !== undefined) patch["domain"] = fields.domain
    if (fields.outputCapabilities !== undefined)
      patch["output_capabilities"] = JSON.stringify(fields.outputCapabilities)
    if (fields.price !== undefined) patch["price"] = String(fields.price)
    if (fields.rating !== undefined) patch["rating"] = String(fields.rating)
    if (fields.ratingCount !== undefined)
      patch["rating_count"] = String(fields.ratingCount)
    if (fields.tags !== undefined) patch["tags"] = JSON.stringify(fields.tags)
    if (fields.visibility !== undefined) {
      patch["visibility"] = fields.visibility
      if (fields.visibility === "private") {
        await this.client.zrem(MARKET_KEY, generatorId)
      }
    }
    if (fields.updatedAt !== undefined)
      patch["updated_at"] = String(fields.updatedAt)

    if (Object.keys(patch).length > 0) {
      await this.client.hset(metaKey(generatorId), patch)
    }
  }

  async incrInstallCount(generatorId: string): Promise<number> {
    return this.client.hincrby(metaKey(generatorId), "install_count", 1)
  }

  async delete(generatorId: string): Promise<void> {
    const pipeline = this.client.pipeline()
    pipeline.del(metaKey(generatorId))
    pipeline.zrem(MARKET_KEY, generatorId)
    await pipeline.exec()
  }
}
