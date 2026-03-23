/**
 * UserGeneratorRepository 接口
 *
 * 用户侧生成器安装记录的存储契约。
 * Redis Key 规范：
 *   cf:u:{userId}:gens                    → ZSet，已安装列表（score = installedAt ms）
 *   cf:u:{userId}:gen:{genId}:install     → Hash，安装详情
 *
 * 宪法 1.6：所有操作强制传 userId，保证数据隔离。
 */

import type { GeneratorInstallRecord } from "../domain/generator.js"

export interface UserGeneratorRepository {
  /** 写入安装记录 */
  save(record: GeneratorInstallRecord): Promise<void>

  /** 查询安装记录，未安装返回 null */
  findInstall(
    userId: string,
    generatorId: string
  ): Promise<GeneratorInstallRecord | null>

  /**
   * 分页查询用户已安装生成器 ID 列表
   * @returns [generatorIds, total]
   */
  listInstalled(
    userId: string,
    offset: number,
    limit: number
  ): Promise<[string[], number]>

  /** 批量检查安装状态（用于市场列表标注 isInstalled） */
  batchCheckInstalled(
    userId: string,
    generatorIds: string[]
  ): Promise<Set<string>>

  /** 删除安装记录（卸载） */
  deleteInstall(userId: string, generatorId: string): Promise<void>
}
