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
  maxRetriesPerRequest: 1,       // 快速失败，不长时间等待
  enableReadyCheck: false,       // 不等 ready 再发命令
  lazyConnect: false,
  retryStrategy: (times: number) => {
    if (times > 10) return null   // 超过 10 次停止重试
    return Math.min(times * 200, 2000) // 200ms 起步，最多 2s
  },
  reconnectOnError: () => true,   // 任何错误都尝试重连
  commandTimeout: 5000,          // 单个命令 5s 超时
})

redis.on("error", (err: Error) => {
  process.stderr.write(`[Redis] connection error: ${err.message}\n`)
})

redis.on("connect", () => {
  process.stdout.write(`[Redis] connected to ${REDIS_URL}\n`)
})

export { redis }
