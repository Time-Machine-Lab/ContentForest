/** 种子生命周期状态 */
export enum SeedStatus {
  Draft = "draft",
  Active = "active",
  Archived = "archived",
}

/**
 * 合法状态流转映射表
 * key: 当前状态, value: 允许流转到的目标状态集合
 *
 * draft   → active, archived
 * active  → archived
 * archived → active  (回档)
 */
export const VALID_TRANSITIONS: Record<SeedStatus, SeedStatus[]> = {
  [SeedStatus.Draft]: [SeedStatus.Active, SeedStatus.Archived],
  [SeedStatus.Active]: [SeedStatus.Archived],
  [SeedStatus.Archived]: [SeedStatus.Active],
}

/** 检查状态流转是否合法 */
export function isValidTransition(from: SeedStatus, to: SeedStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

/** 种子实体 */
export interface Seed {
  /** 唯一标识，格式: seed_{YYYYMMDD}_{nanoid(8)} */
  id: string
  /** 所属用户 ID */
  userId: string
  /** 标题 */
  title: string
  /** Markdown 正文内容（仅详情接口返回，列表接口不含此字段） */
  content?: string
  /** 标签列表 */
  tags: string[]
  /** 生命周期状态 */
  status: SeedStatus
  /** 创建时间（毫秒时间戳） */
  createdAt: number
  /** 最后更新时间（毫秒时间戳） */
  updatedAt: number
  /** 已生成果实数量（冗余计数，由果实模块维护） */
  fruitCount: number
}

/** 创建种子时的输入 DTO */
export interface CreateSeedDto {
  title: string
  content: string
  tags?: string[]
  /** 若提供则为 upsert（更新已有草稿），不提供则创建新种子 */
  id?: string
}

/** 更新种子时的输入 DTO（状态字段通过专用接口变更，不在此处） */
export interface UpdateSeedDto {
  title?: string
  content?: string
  tags?: string[]
}

/** 列表查询过滤条件 */
export interface SeedFilter {
  status?: SeedStatus
  tags?: string[]
}

/** 分页参数 */
export interface PaginationParams {
  page: number
  size: number
}

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[]
  total: number
}
