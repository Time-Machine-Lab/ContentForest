/**
 * 生成器仓储接口
 *
 * 市场侧：平台生成器元数据的存储契约
 * Redis Key 规范：
 *   cf:gen:{genId}:meta      — Hash，生成器元数据
 *   cf:market:gens           — ZSet，市场索引（score = updatedAt，仅 public 生成器）
 *
 * 宪法 1.3：业务逻辑在 Service 层，此接口只定义存储契约。
 */

import type { GeneratorMetadata } from "../domain/generator.js"

export interface GeneratorRepository {
  /** 写入生成器元数据 */
  save(meta: GeneratorMetadata): Promise<void>

  /** 按 ID 查询元数据，不存在返回 null */
  findById(generatorId: string): Promise<GeneratorMetadata | null>

  /** 批量查询元数据 */
  findByIds(generatorIds: string[]): Promise<GeneratorMetadata[]>

  /**
   * 从市场 ZSet 分页查询（仅 public 生成器）
   * @returns [generatorIds, total]
   */
  listMarket(offset: number, limit: number): Promise<[string[], number]>

  /** 更新元数据字段（部分更新） */
  update(generatorId: string, fields: Partial<GeneratorMetadata>): Promise<void>

  /** 原子性递增 installCount */
  incrInstallCount(generatorId: string): Promise<number>

  /** 删除生成器元数据（同步从市场索引移除） */
  delete(generatorId: string): Promise<void>
}
