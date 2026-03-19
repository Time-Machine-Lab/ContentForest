/**
 * 生成器文件系统存储层
 *
 * 职责：
 * - 管理用户 Skill 目录（/cf/data/{userId}/generators/{generatorId}/）
 * - 管理平台 Skill 目录（/cf/platform/generators/{generatorId}/skills/）
 * - zip 包解压与校验
 * - 生成日志文件读写
 *
 * 宪法合规：
 * - 1.5 所有文件操作通过此模块统一封装
 * - 1.6 所有用户路径强制包含 userId
 */

import fs from "node:fs/promises"
import path from "node:path"
import { createRequire } from "node:module"
import { CF_DATA_ROOT } from "../config.js"

const require = createRequire(import.meta.url)

/** 平台生成器 Skill 存储根目录 */
export const CF_PLATFORM_ROOT =
  process.env.CF_PLATFORM_ROOT ??
  path.resolve(CF_DATA_ROOT, "..", "..", "cf", "platform")

// ---------------------------------------------------------------------------
// 路径计算
// ---------------------------------------------------------------------------

/** 用户生成器 Skill 目录 */
export function getUserSkillDir(userId: string, generatorId: string): string {
  return path.join(CF_DATA_ROOT, userId, "generators", generatorId)
}

/** 平台生成器 Skill 目录 */
export function getPlatformSkillDir(generatorId: string): string {
  return path.join(CF_PLATFORM_ROOT, "generators", generatorId, "skills")
}

/** 生成日志文件路径 */
export function getGenerationLogPath(userId: string, logId: string): string {
  return path.join(CF_DATA_ROOT, userId, "logs", "generation", `${logId}.json`)
}

// ---------------------------------------------------------------------------
// 目录工具
// ---------------------------------------------------------------------------

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err
}

// ---------------------------------------------------------------------------
// 2.1 将平台 Skill 目录内容复制到用户目录
// ---------------------------------------------------------------------------

/**
 * 将平台 Skill 源目录的内容递归复制到用户 Skill 目录。
 * @returns 用户 Skill 目录绝对路径
 */
export async function copySkillToUser(
  userId: string,
  generatorId: string
): Promise<string> {
  const src = getPlatformSkillDir(generatorId)
  const dest = getUserSkillDir(userId, generatorId)
  await ensureDir(dest)
  await copyDirRecursive(src, dest)
  return dest
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  await ensureDir(dest)
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

// ---------------------------------------------------------------------------
// 2.2 用户 Skill 目录删除
// ---------------------------------------------------------------------------

/**
 * 递归删除用户 Skill 目录。
 * 目录不存在时记录 warning 不抛错（幂等）。
 */
export async function deleteUserSkillDir(
  userId: string,
  generatorId: string
): Promise<void> {
  const dir = getUserSkillDir(userId, generatorId)
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") {
      process.stderr.write(
        `[generator-fs] warn: skill dir not found, skipping: ${dir}\n`
      )
      return
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// 2.3 平台 Skill 目录写入
// ---------------------------------------------------------------------------

/**
 * 将解压后的文件写入平台 Skill 目录。
 * @param generatorId 生成器 ID
 * @param files Map<相对路径, 文件内容Buffer>
 * @returns 平台 Skill 目录绝对路径
 */
export async function writePlatformSkillFiles(
  generatorId: string,
  files: Map<string, Buffer>
): Promise<string> {
  const dir = getPlatformSkillDir(generatorId)
  await ensureDir(dir)
  for (const [relPath, content] of files) {
    const filePath = path.join(dir, relPath)
    await ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, content)
  }
  return dir
}

// ---------------------------------------------------------------------------
// 2.4 zip 解压与 SKILL.md 校验
// ---------------------------------------------------------------------------

export class InvalidSkillPackageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidSkillPackageError"
  }
}

/**
 * 纯 Node.js zip 解析（无外部依赖，兼容 Node v23）。
 * 支持 STORED (0) 和 DEFLATED (8) 压缩方式。
 */
export async function extractAndValidateZip(
  zipBuffer: Buffer
): Promise<Map<string, Buffer>> {
  const { inflateRawSync } = require("node:zlib") as typeof import("node:zlib")
  const files = new Map<string, Buffer>()

  // 强制拷贝一份独立 Buffer，彻底避免内存池引用问题
  const buf = Buffer.allocUnsafe(zipBuffer.length)
  zipBuffer.copy(buf)

  process.stderr.write(`[zip] parse start, len=${buf.length}, sig=${buf.readUInt32LE(0).toString(16)}\n`)

  let offset = 0
  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset)
    if (sig !== 0x04034b50) break // Local file header signature

    const compression = buf.readUInt16LE(offset + 8)
    const compSize    = buf.readUInt32LE(offset + 18)
    const nameLen     = buf.readUInt16LE(offset + 26)
    const extraLen    = buf.readUInt16LE(offset + 28)
    const name        = buf.slice(offset + 30, offset + 30 + nameLen).toString("utf-8")
    const dataOffset  = offset + 30 + nameLen + extraLen
    const compData    = buf.slice(dataOffset, dataOffset + compSize)

    process.stderr.write(`[zip] entry name=${name} comp=${compression} compSize=${compSize} dataOffset=${dataOffset} compDataLen=${compData.length}\n`)

    if (!name.endsWith("/")) {
      let content: Buffer
      if (compression === 0) {
        content = Buffer.from(compData) // 显式拷贝
      } else if (compression === 8) {
        content = inflateRawSync(compData)
      } else {
        throw new InvalidSkillPackageError(`Unsupported compression method ${compression} for: ${name}`)
      }
      const parts = name.split("/")
      const relPath = parts.length > 1 ? parts.slice(1).join("/") : parts[0]!
      if (relPath) files.set(relPath, content)
      process.stderr.write(`[zip] stored relPath=${relPath} contentLen=${content.length}\n`)
    }

    offset = dataOffset + compSize
  }

  process.stderr.write(`[zip] total files: ${files.size} [${[...files.keys()].join(', ')}]\n`)

  if (files.size === 0) {
    throw new InvalidSkillPackageError("Invalid skill package: zip appears empty or corrupt")
  }

  const hasSkillMd = [...files.keys()].some(
    (p) => p === "SKILL.md" || p.toLowerCase() === "skill.md"
  )
  if (!hasSkillMd) {
    throw new InvalidSkillPackageError(
      "Invalid skill package: SKILL.md not found in root directory"
    )
  }

  return files
}

// ---------------------------------------------------------------------------
// 生成日志文件读写
// ---------------------------------------------------------------------------

/**
 * 写入生成日志 JSON 文件。
 */
export async function writeGenerationLog(
  userId: string,
  logId: string,
  log: unknown
): Promise<void> {
  const filePath = getGenerationLogPath(userId, logId)
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, JSON.stringify(log, null, 2), "utf-8")
}

/**
 * 读取生成日志 JSON 文件。
 * 文件不存在时返回 null。
 */
export async function readGenerationLog(
  userId: string,
  logId: string
): Promise<unknown | null> {
  const filePath = getGenerationLogPath(userId, logId)
  try {
    const raw = await fs.readFile(filePath, "utf-8")
    return JSON.parse(raw)
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") return null
    throw err
  }
}
