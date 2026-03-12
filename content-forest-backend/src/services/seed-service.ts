/**
 * 种子业务服务层
 *
 * 职责：封装种子完整生命周期的业务逻辑。
 * 依赖注入：SeedRepository（Redis 元数据）+ file-storage（Markdown 冷存储）
 *
 * 宪法合规：
 * - 1.3 业务逻辑（状态流转校验、ID 生成、双写协调）在此层，不在 Repository 或 API 层
 * - 1.5 Agent 只能通过 MCP/API 调用此层，不直接操作存储
 * - 1.6 所有方法强制传入 userId，保证数据隔离
 */

import { nanoid } from "nanoid"
import type { SeedRepository } from "../repositories/seed-repository.js"
import {
  SeedStatus,
  isValidTransition,
} from "../domain/seed.js"
import type {
  CreateSeedDto,
  PaginatedResult,
  PaginationParams,
  Seed,
  SeedFilter,
  UpdateSeedDto,
} from "../domain/seed.js"
import {
  writeSeedFile,
  readSeedFile,
  deleteSeedFile,
} from "../storage/file-storage.js"

// ---------------------------------------------------------------------------
// 自定义错误
// ---------------------------------------------------------------------------

export class SeedNotFoundError extends Error {
  constructor(seedId: string) {
    super(`Seed not found: ${seedId}`)
    this.name = "SeedNotFoundError"
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: SeedStatus, to: SeedStatus) {
    super(`Invalid status transition: ${from} → ${to}`)
    this.name = "InvalidTransitionError"
  }
}

// ---------------------------------------------------------------------------
// ID 生成
// ---------------------------------------------------------------------------

function generateSeedId(): string {
  const date = new Date()
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `seed_${yyyy}${mm}${dd}_${nanoid(8)}`
}

// ---------------------------------------------------------------------------
// SeedService
// ---------------------------------------------------------------------------

export class SeedService {
  constructor(private readonly repo: SeedRepository) {}

  // -------------------------------------------------------------------------
  // 5.2 create
  // -------------------------------------------------------------------------
  /**
   * 创建新种子（默认 draft 状态）或 upsert 已有草稿。
   * 同步双写 Redis 元数据 + Markdown 文件。
   * 优先写 Redis（主数据源），文件写失败记录日志但不回滚（设计决策 #1）。
   */
  async create(userId: string, dto: CreateSeedDto): Promise<Seed> {
    // upsert：如果提供了 id 且种子存在且为 draft，则更新
    if (dto.id) {
      const existing = await this.repo.findById(userId, dto.id)
      if (existing) {
        if (existing.status !== SeedStatus.Draft) {
          throw new InvalidTransitionError(existing.status, SeedStatus.Draft)
        }
        return this.updateDraft(userId, dto.id, dto, existing.createdAt)
      }
    }

    const now = Date.now()
    const id = dto.id ?? generateSeedId()

    // 1. 写入 Redis（主数据源）
    const seed = await this.repo.create(userId, {
      ...dto,
      id,
      createdAt: now,
      updatedAt: now,
    })

    // 2. 写入 Markdown 文件（冷存储，失败不回滚）
    await writeSeedFile(userId, {
      id: seed.id,
      title: seed.title,
      content: dto.content,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
    }).catch((err: unknown) => {
      process.stderr.write(
        `[SeedService] file write failed for ${id}: ${String(err)}\n`
      )
    })

    return { ...seed, content: dto.content }
  }

  /** upsert 已有草稿的内部方法 */
  private async updateDraft(
    userId: string,
    seedId: string,
    dto: CreateSeedDto,
    createdAt: number
  ): Promise<Seed> {
    const now = Date.now()
    await this.repo.update(userId, seedId, {
      title: dto.title,
      tags: dto.tags,
      updatedAt: now,
    })
    await writeSeedFile(userId, {
      id: seedId,
      title: dto.title,
      content: dto.content,
      createdAt,
      updatedAt: now,
    }).catch((err: unknown) => {
      process.stderr.write(
        `[SeedService] file write failed for ${seedId}: ${String(err)}\n`
      )
    })
    const meta = await this.repo.findById(userId, seedId)
    return { ...meta!, content: dto.content }
  }

  // -------------------------------------------------------------------------
  // 5.3 findById
  // -------------------------------------------------------------------------
  /**
   * 查询种子完整信息：Redis 元数据 + Markdown 文件内容合并。
   */
  async findById(userId: string, seedId: string): Promise<Seed> {
    const meta = await this.repo.findById(userId, seedId)
    if (!meta) throw new SeedNotFoundError(seedId)

    const fileData = await readSeedFile(userId, seedId, meta.createdAt)
    return {
      ...meta,
      content: fileData?.content ?? "",
    }
  }

  // -------------------------------------------------------------------------
  // 5.4 list
  // -------------------------------------------------------------------------
  /**
   * 分页查询种子列表（仅元数据，不读文件）。
   */
  async list(
    userId: string,
    filter: SeedFilter,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Omit<Seed, "content">>> {
    return this.repo.list(userId, filter, pagination)
  }

  // -------------------------------------------------------------------------
  // 5.5 update
  // -------------------------------------------------------------------------
  /**
   * 更新种子内容信息（title/content/tags）。
   * 禁止通过此方法变更 status（状态变更走专用方法）。
   */
  async update(
    userId: string,
    seedId: string,
    updates: UpdateSeedDto
  ): Promise<Seed> {
    const meta = await this.repo.findById(userId, seedId)
    if (!meta) throw new SeedNotFoundError(seedId)

    const now = Date.now()
    // 1. 更新 Redis 元数据
    await this.repo.update(userId, seedId, {
      title: updates.title,
      tags: updates.tags,
      updatedAt: now,
    })

    // 2. 若 title 或 content 有变更，重写 Markdown 文件
    if (updates.title !== undefined || updates.content !== undefined) {
      const fileData = await readSeedFile(userId, seedId, meta.createdAt)
      await writeSeedFile(userId, {
        id: seedId,
        title: updates.title ?? meta.title,
        content: updates.content ?? fileData?.content ?? "",
        createdAt: meta.createdAt,
        updatedAt: now,
      }).catch((err: unknown) => {
        process.stderr.write(
          `[SeedService] file write failed for ${seedId}: ${String(err)}\n`
        )
      })
    }

    return this.findById(userId, seedId)
  }

  // -------------------------------------------------------------------------
  // 专用状态流转方法（供 API 层调用）
  // -------------------------------------------------------------------------

  async publish(userId: string, seedId: string): Promise<Seed> {
    return this.transitionStatus(userId, seedId, SeedStatus.Active)
  }

  async archive(userId: string, seedId: string): Promise<Seed> {
    return this.transitionStatus(userId, seedId, SeedStatus.Archived)
  }

  async restore(userId: string, seedId: string): Promise<Seed> {
    return this.transitionStatus(userId, seedId, SeedStatus.Active)
  }

  private async transitionStatus(
    userId: string,
    seedId: string,
    to: SeedStatus
  ): Promise<Seed> {
    const meta = await this.repo.findById(userId, seedId)
    if (!meta) throw new SeedNotFoundError(seedId)
    if (!isValidTransition(meta.status, to)) {
      throw new InvalidTransitionError(meta.status, to)
    }
    const now = Date.now()
    await this.repo.update(userId, seedId, { status: to, updatedAt: now })
    return this.findById(userId, seedId)
  }

  // -------------------------------------------------------------------------
  // 5.6 delete
  // -------------------------------------------------------------------------
  /**
   * 物理删除种子：同步清除 Redis 元数据 + Markdown 文件。
   */
  async delete(userId: string, seedId: string): Promise<void> {
    const meta = await this.repo.findById(userId, seedId)
    if (!meta) throw new SeedNotFoundError(seedId)

    // 1. 删除 Redis 数据
    await this.repo.delete(userId, seedId)

    // 2. 删除 Markdown 文件
    await deleteSeedFile(userId, seedId, meta.createdAt).catch((err: unknown) => {
      process.stderr.write(
        `[SeedService] file delete failed for ${seedId}: ${String(err)}\n`
      )
    })
  }
}
