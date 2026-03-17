/**
 * GeneratorService — 生成器业务服务层
 */

import { nanoid } from "nanoid"
import type { GeneratorRepository } from "../repositories/generator-repository.js"
import type { UserGeneratorRepository } from "../repositories/user-generator-repository.js"
import {
  copySkillToUser,
  deleteUserSkillDir,
  writePlatformSkillFiles,
  extractAndValidateZip,
  writeGenerationLog,
  InvalidSkillPackageError,
} from "../storage/generator-fs.js"
import { redis } from "../storage/redis-client.js"
import type {
  GeneratorMetadata,
  GeneratorMarketFilter,
  GeneratorPage,
  GeneratorMarketItem,
  GeneratorInstallRecord,
  UploadGeneratorDto,
  GenerationLog,
} from "../domain/generator.js"

export class GeneratorNotFoundError extends Error {
  constructor(id: string) { super(`Generator not found: ${id}`); this.name = "GeneratorNotFoundError" }
}
export class GeneratorAlreadyInstalledError extends Error {
  constructor(id: string) { super(`Generator already installed: ${id}`); this.name = "GeneratorAlreadyInstalledError" }
}
export class GeneratorNotInstalledError extends Error {
  constructor(id: string) { super(`Generator not installed: ${id}`); this.name = "GeneratorNotInstalledError" }
}
export { InvalidSkillPackageError }

function genId(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`
  return `gen_${ymd}_${nanoid(8)}`
}
function logId(): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`
  return `log_${ymd}_${nanoid(8)}`
}

export class GeneratorService {
  constructor(
    private readonly genRepo: GeneratorRepository,
    private readonly userGenRepo: UserGeneratorRepository
  ) {}

  async listMarket(filter: GeneratorMarketFilter, userId?: string): Promise<GeneratorPage<GeneratorMarketItem>> {
    const { page, pageSize, platform, domain, keyword } = filter
    const [allIds] = await this.genRepo.listMarket(0, 10000)
    let metas = await this.genRepo.findByIds(allIds)
    if (platform) metas = metas.filter(m => m.platform === platform)
    if (domain) metas = metas.filter(m => m.domain === domain)
    if (keyword) {
      const kw = keyword.toLowerCase()
      metas = metas.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        m.description.toLowerCase().includes(kw) ||
        m.tags.some(t => t.toLowerCase().includes(kw))
      )
    }
    const total = metas.length
    const offset = (page - 1) * pageSize
    const pageItems = metas.slice(offset, offset + pageSize)
    let installedSet = new Set<string>()
    if (userId && pageItems.length > 0) {
      installedSet = await this.userGenRepo.batchCheckInstalled(userId, pageItems.map(m => m.id))
    }
    return {
      list: pageItems.map(m => ({ ...m, isInstalled: userId ? installedSet.has(m.id) : undefined })),
      total, page, pageSize,
    }
  }

  async getGenerator(generatorId: string, userId?: string): Promise<GeneratorMarketItem> {
    const meta = await this.genRepo.findById(generatorId)
    if (!meta) throw new GeneratorNotFoundError(generatorId)
    let isInstalled: boolean | undefined
    if (userId) {
      const rec = await this.userGenRepo.findInstall(userId, generatorId)
      isInstalled = rec !== null
    }
    return { ...meta, isInstalled }
  }

  async listMine(userId: string, page: number, pageSize: number): Promise<GeneratorPage<GeneratorMarketItem & { installedAt: number; skillPath: string }>> {
    const offset = (page - 1) * pageSize
    const [ids, total] = await this.userGenRepo.listInstalled(userId, offset, pageSize)
    if (ids.length === 0) return { list: [], total, page, pageSize }
    const metas = await this.genRepo.findByIds(ids)
    const metaMap = new Map(metas.map(m => [m.id, m]))
    const list = await Promise.all(ids.map(async id => {
      const meta = metaMap.get(id)
      const rec = await this.userGenRepo.findInstall(userId, id)
      return { ...(meta ?? { id } as GeneratorMetadata), isInstalled: true, installedAt: rec?.installedAt ?? 0, skillPath: rec?.skillPath ?? "" }
    }))
    return { list, total, page, pageSize }
  }

  async install(userId: string, generatorId: string): Promise<GeneratorInstallRecord> {
    const meta = await this.genRepo.findById(generatorId)
    if (!meta) throw new GeneratorNotFoundError(generatorId)
    const existing = await this.userGenRepo.findInstall(userId, generatorId)
    if (existing) throw new GeneratorAlreadyInstalledError(generatorId)
    const skillPath = await copySkillToUser(userId, generatorId)
    const record: GeneratorInstallRecord = { generatorId, userId, installedAt: Date.now(), skillPath }
    await this.userGenRepo.save(record)
    await this.genRepo.incrInstallCount(generatorId)
    return record
  }

  async upload(userId: string, dto: UploadGeneratorDto, zipBuffer: Buffer): Promise<{ meta: GeneratorMetadata; installRecord: GeneratorInstallRecord }> {
    const files = await extractAndValidateZip(zipBuffer)
    const now = Date.now()
    const id = genId()
    await writePlatformSkillFiles(id, files)
    const meta: GeneratorMetadata = {
      id, name: dto.name, description: dto.description, platform: dto.platform,
      contentTypes: dto.contentTypes ?? [], domain: dto.domain ?? "", author: userId,
      outputCapabilities: dto.outputCapabilities ?? [], price: dto.price ?? 0,
      installCount: 0, rating: 0, ratingCount: 0, tags: dto.tags ?? [],
      visibility: "public", createdAt: now, updatedAt: now,
    }
    await this.genRepo.save(meta)
    const skillPath = await copySkillToUser(userId, id)
    const installRecord: GeneratorInstallRecord = { generatorId: id, userId, installedAt: now, skillPath }
    await this.userGenRepo.save(installRecord)
    await this.genRepo.incrInstallCount(id)
    return { meta, installRecord }
  }

  async uninstall(userId: string, generatorId: string): Promise<void> {
    const record = await this.userGenRepo.findInstall(userId, generatorId)
    if (!record) throw new GeneratorNotInstalledError(generatorId)
    await deleteUserSkillDir(userId, generatorId)
    await this.userGenRepo.deleteInstall(userId, generatorId)
  }

  async writeLog(userId: string, logData: Omit<GenerationLog, "id" | "userId" | "createdAt">): Promise<GenerationLog> {
    const id = logId()
    const now = Date.now()
    const log: GenerationLog = { id, userId, createdAt: now, ...logData }
    await Promise.all([
      redis.set(`cf:u:${userId}:genlog:${id}`, JSON.stringify(log)),
      writeGenerationLog(userId, id, log),
    ])
    return log
  }

  async getInstallRecord(userId: string, generatorId: string): Promise<GeneratorInstallRecord | null> {
    return this.userGenRepo.findInstall(userId, generatorId)
  }
}
