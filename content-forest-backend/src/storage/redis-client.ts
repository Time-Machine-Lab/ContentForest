/**
 * Redis 客户端单例
 *
 * 使用 ioredis，连接配置从 config.ts 读取（支持 REDIS_URL 环境变量覆盖）。
 * 导出单例 `redis`，供 Repository 层使用。
 *
 * 宪法 1.3：存储基础设施在此封装，业务层不直接 import ioredis。
 */

import { Redis } from "ioredis"
import { REDIS_URL } from "../config.js"

const redis = new Redis(REDIS_URL, {
  // 连接失败时自动重试，最多 3 次，避免启动时因 Redis 未就绪崩溃
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
})

redis.on("error", (err: Error) => {
  process.stderr.write(`[Redis] connection error: ${err.message}\n`)
})

redis.on("connect", () => {
  process.stdout.write(`[Redis] connected to ${REDIS_URL}\n`)
})

export { redis }
