import type {
  CreateSeedDto,
  PaginatedResult,
  PaginationParams,
  Seed,
  SeedFilter,
  UpdateSeedDto,
} from "../domain/seed.js"

/**
 * 种子仓储接口
 * 定义种子元数据的持久化契约，具体实现由 RedisSeedRepository 提供。
 * 接口只负责元数据的 CRUD，文件内容的读写由 file-storage 负责。
 */
export interface SeedRepository {
  /**
   * 创建新种子（写入元数据）
   * @returns 完整的 Seed 对象（不含 content 正文）
   */
  create(userId: string, dto: CreateSeedDto & { id: string; createdAt: number; updatedAt: number }): Promise<Seed>

  /**
   * 按 ID 查找种子元数据
   * @returns Seed 元数据（不含 content），不存在时返回 null
   */
  findById(userId: string, seedId: string): Promise<Omit<Seed, "content"> | null>

  /**
   * 分页查询种子列表（仅元数据，不含 content）
   */
  list(
    userId: string,
    filter: SeedFilter,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Omit<Seed, "content">>>

  /**
   * 更新种子元数据字段
   * @param updates 可更新 title、tags、status、updatedAt、fruitCount
   */
  update(
    userId: string,
    seedId: string,
    updates: Partial<UpdateSeedDto & { status: string; updatedAt: number; fruitCount: number }>
  ): Promise<void>

  /**
   * 物理删除种子元数据（Hash + ZSet 条目）
   */
  delete(userId: string, seedId: string): Promise<void>
}
