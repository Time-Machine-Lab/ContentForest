/**
 * 生成器领域模型
 *
 * 生成器（Generator）是内容生成的执行单元，由 Skill 文件 + 元数据构成。
 * 元数据持久化到 Redis，Skill 文件存储到本地文件系统。
 *
 * 宪法合规：
 * - 1.6 userId 严格隔离，用户安装记录与市场数据分离
 */

// ---------------------------------------------------------------------------
// 生成器元数据
// ---------------------------------------------------------------------------

/** 支持的内容平台 */
export type GeneratorPlatform =
  | "xiaohongshu"
  | "douyin"
  | "twitter"
  | "wechat"
  | "other"

/** 生成器可见性 */
export type GeneratorVisibility = "private" | "public"

/**
 * 生成器元数据（市场侧，平台维护）
 * Redis Key: cf:gen:{genId}:meta
 */
export interface GeneratorMetadata {
  /** 全局唯一标识，格式: gen_{YYYYMMDD}_{nanoid(8)} */
  id: string
  /** 生成器名称 */
  name: string
  /** 功能描述 */
  description: string
  /** 所属平台 */
  platform: GeneratorPlatform
  /** 支持的内容类型，如 ['图文', '视频脚本'] */
  contentTypes: string[]
  /** 适用领域/垂类，如 '美食'、'旅行' */
  domain: string
  /** 创建者用户 ID */
  author: string
  /** 输出能力描述，如 ['小红书图文', 'SEO 标题'] */
  outputCapabilities: string[]
  /** 价格，0 表示免费（MVP 预留字段，不实装支付） */
  price: number
  /** 历史安装总量（只增不减） */
  installCount: number
  /** 平均评分（0-5） */
  rating: number
  /** 评分人数 */
  ratingCount: number
  /** 标签列表，用于搜索与分类 */
  tags: string[]
  /** 可见性：private（草稿/私有）| public（已发布到市场） */
  visibility: GeneratorVisibility
  /** 创建时间（毫秒时间戳） */
  createdAt: number
  /** 最后更新时间（毫秒时间戳） */
  updatedAt: number
}

/**
 * 用户安装记录（用户侧，用户隔离）
 * Redis Key: cf:u:{userId}:gen:{genId}:install
 */
export interface GeneratorInstallRecord {
  /** 生成器 ID */
  generatorId: string
  /** 用户 ID */
  userId: string
  /** 安装时间（毫秒时间戳） */
  installedAt: number
  /** 本地 Skill 文件夹路径（绝对路径） */
  skillPath: string
}

// ---------------------------------------------------------------------------
// 生成日志
// ---------------------------------------------------------------------------

/**
 * 单次内容生成日志
 * Redis Key: cf:u:{userId}:genlog:{logId}
 * 文件路径: /cf/data/{userId}/logs/generation/{logId}.json
 */
export interface GenerationLog {
  /** 日志唯一 ID */
  id: string
  /** 用户 ID */
  userId: string
  /** 使用的生成器 ID */
  generatorId: string
  /** 关联的种子 ID（可选，与 fruitId 二选一或均不填） */
  seedId?: string
  /** 关联的果实 ID（可选，当本次生成是对已有果实的再加工时填写） */
  fruitId?: string
  /** 生成输入参数 */
  input: Record<string, unknown>
  /** 生成结果（Markdown 正文） */
  output: string
  /** 生成状态 */
  status: "success" | "failed"
  /** 错误信息（status=failed 时） */
  error?: string
  /** 生成耗时（毫秒） */
  durationMs: number
  /** 创建时间（毫秒时间戳） */
  createdAt: number
}

// ---------------------------------------------------------------------------
// DTO
// ---------------------------------------------------------------------------

/** 上传生成器时的元数据输入 */
export interface UploadGeneratorDto {
  name: string
  description: string
  platform: GeneratorPlatform
  contentTypes?: string[]
  domain?: string
  outputCapabilities?: string[]
  tags?: string[]
  price?: number
}

/** 市场列表查询参数 */
export interface GeneratorMarketFilter {
  platform?: GeneratorPlatform
  domain?: string
  tags?: string[]
  keyword?: string
  page: number
  pageSize: number
}

/** 分页结果（复用通用结构） */
export interface GeneratorPage<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 市场列表项（附带当前用户安装状态） */
export type GeneratorMarketItem = GeneratorMetadata & {
  isInstalled?: boolean
}
