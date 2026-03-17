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
import { CF_DATA_ROOT } from "../config.js"

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
 * 解压 zip Buffer，返回文件内容 Map<相对路径, Buffer>。
 * 校验根目录必须包含 SKILL.md，否则抛 InvalidSkillPackageError。
 *
 * 依赖：unzipper（需在 package.json 中声明）
 */
export async function extractAndValidateZip(
  zipBuffer: Buffer
): Promise<Map<string, Buffer>> {
  const unzipper = await import("unzipper").catch(() => {
    throw new Error(
      "unzipper is not installed. Run: npm install unzipper @types/unzipper"
    )
  })

  const directory = await unzipper.Open.buffer(zipBuffer)
  const files = new Map<string, Buffer>()

  // 收集所有文件
  for (const file of directory.files) {
    if (file.type === "Directory") continue
    const content = await file.buffer()
    // 去除 zip 根目录前缀（如 my-skill/SKILL.md → SKILL.md）
    const parts = file.path.split("/")
    const relPath = parts.length > 1 ? parts.slice(1).join("/") : parts[0]
    if (relPath) files.set(relPath, content)
  }

  // 校验 SKILL.md 存在
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
