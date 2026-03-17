/**
 * UserGeneratorRepository — Redis 实现
 *
 * Key 设计：
 *   cf:u:{userId}:gens                  → ZSet，已安装列表（score = installedAt ms）
 *   cf:u:{userId}:gen:{genId}:install   → Hash，安装详情
 *
 * 宪法 1.3：此层只做数据读写，不含业务逻辑。
 */

import type { Redis } from "ioredis"
import { redis as defaultRedis } from "../storage/redis-client.js"
import type { UserGeneratorRepository } from "./user-generator-repository.js"
import type { GeneratorInstallRecord } from "../domain/generator.js"

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const installedListKey = (userId: string) => `cf:u:${userId}:gens`
const installKey = (userId: string, genId: string) =>
  `cf:u:${userId}:gen:${genId}:install`

// ---------------------------------------------------------------------------
// Hash 序列化 / 反序列化
// ---------------------------------------------------------------------------

function toHash(r: GeneratorInstallRecord): Record<string, string> {
  return {
    generator_id: r.generatorId,
    user_id: r.userId,
    installed_at: String(r.installedAt),
    skill_path: r.skillPath,
  }
}

function fromHash(
  hash: Record<string, string>
): GeneratorInstallRecord | null {
  if (!hash["generator_id"]) return null
  return {
    generatorId: hash["generator_id"],
    userId: hash["user_id"] ?? "",
    installedAt: Number(hash["installed_at"] ?? 0),
    skillPath: hash["skill_path"] ?? "",
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class RedisUserGeneratorRepository
  implements UserGeneratorRepository
{
  constructor(private readonly client: Redis = defaultRedis) {}

  async save(record: GeneratorInstallRecord): Promise<void> {
    const pipeline = this.client.pipeline()
    pipeline.hset(installKey(record.userId, record.generatorId), toHash(record))
    pipeline.zadd(
      installedListKey(record.userId),
      record.installedAt,
      record.generatorId
    )
    await pipeline.exec()
  }

  async findInstall(
    userId: string,
    generatorId: string
  ): Promise<GeneratorInstallRecord | null> {
    const hash = await this.client.hgetall(installKey(userId, generatorId))
    if (!hash || Object.keys(hash).length === 0) return null
    return fromHash(hash)
  }

  async listInstalled(
    userId: string,
    offset: number,
    limit: number
  ): Promise<[string[], number]> {
    const pipeline = this.client.pipeline()
    pipeline.zrevrange(installedListKey(userId), offset, offset + limit - 1)
    pipeline.zcard(installedListKey(userId))
    const results = await pipeline.exec()
    if (!results) return [[], 0]
    const ids = (results[0]?.[1] as string[]) ?? []
    const total = (results[1]?.[1] as number) ?? 0
    return [ids, total]
  }

  async batchCheckInstalled(
    userId: string,
    generatorIds: string[]
  ): Promise<Set<string>> {
    if (generatorIds.length === 0) return new Set()
    const pipeline = this.client.pipeline()
    for (const id of generatorIds) {
      pipeline.exists(installKey(userId, id))
    }
    const results = await pipeline.exec()
    const installed = new Set<string>()
    if (!results) return installed
    results.forEach(([err, exists], idx) => {
      if (!err && exists === 1) {
        installed.add(generatorIds[idx])
      }
    })
    return installed
  }

  async deleteInstall(userId: string, generatorId: string): Promise<void> {
    const pipeline = this.client.pipeline()
    pipeline.del(installKey(userId, generatorId))
    pipeline.zrem(installedListKey(userId), generatorId)
    await pipeline.exec()
  }
}
