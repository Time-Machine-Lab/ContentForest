/**
 * 文件系统冷存储层
 *
 * 职责：将种子内容以 Markdown + YAML Frontmatter 格式持久化到本地文件系统。
 * 路径规则：{CF_DATA_ROOT}/{userId}/seeds/{YYYY}/{seedId}.md
 *
 * 宪法合规：
 * - 1.5 所有文件操作通过此模块统一封装，禁止业务层直接操作 fs
 * - 1.6 所有路径强制包含 userId，保证用户数据隔离
 */

import fs from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { CF_DATA_ROOT } from "../config.js"
import type { Seed } from "../domain/seed.js"

// ---------------------------------------------------------------------------
// 3.1 路径计算
// ---------------------------------------------------------------------------

/**
 * 计算种子 Markdown 文件的绝对路径。
 * 格式：{CF_DATA_ROOT}/{userId}/seeds/{YYYY}/{seedId}.md
 *
 * @param userId   用户 ID（保证数据隔离，宪法 1.6）
 * @param seedId   种子 ID
 * @param createdAt 创建时间毫秒时间戳，用于确定年份目录
 */
export function getSeedFilePath(
  userId: string,
  seedId: string,
  createdAt: number
): string {
  const year = new Date(createdAt).getFullYear().toString()
  return path.join(CF_DATA_ROOT, userId, "seeds", year, `${seedId}.md`)
}

// ---------------------------------------------------------------------------
// 3.2 目录工具
// ---------------------------------------------------------------------------

/**
 * 确保目录存在，不存在时递归创建。
 * @param dirPath 目标目录绝对路径
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

// ---------------------------------------------------------------------------
// 3.3 写入种子文件
// ---------------------------------------------------------------------------

/**
 * 将种子写入 Markdown 文件（YAML Frontmatter + 正文）。
 * 目录不存在时自动创建（宪法 1.6 场景：首次创建某年份目录）。
 *
 * Frontmatter 字段：id, title, creator_id, created_at, updated_at
 * 正文：seed.content（Markdown 原文）
 */
export async function writeSeedFile(
  userId: string,
  seed: Pick<Seed, "id" | "title" | "content" | "createdAt" | "updatedAt">
): Promise<void> {
  const filePath = getSeedFilePath(userId, seed.id, seed.createdAt)
  await ensureDir(path.dirname(filePath))

  const frontmatter: Record<string, unknown> = {
    id: seed.id,
    title: seed.title,
    creator_id: userId,
    created_at: new Date(seed.createdAt).toISOString(),
    updated_at: new Date(seed.updatedAt).toISOString(),
  }

  const fileContent = matter.stringify(seed.content ?? "", frontmatter)
  await fs.writeFile(filePath, fileContent, "utf-8")
}

// ---------------------------------------------------------------------------
// 3.4 读取种子文件
// ---------------------------------------------------------------------------

export interface SeedFileData {
  /** Frontmatter 元数据 */
  frontmatter: {
    id: string
    title: string
    creator_id: string
    created_at: string
    updated_at: string
    [key: string]: unknown
  }
  /** Markdown 正文内容 */
  content: string
}

/**
 * 读取并解析种子 Markdown 文件。
 * @returns 解析后的 frontmatter 和正文，文件不存在时返回 null
 */
export async function readSeedFile(
  userId: string,
  seedId: string,
  createdAt: number
): Promise<SeedFileData | null> {
  const filePath = getSeedFilePath(userId, seedId, createdAt)

  let raw: string
  try {
    raw = await fs.readFile(filePath, "utf-8")
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") return null
    throw err
  }

  const parsed = matter(raw)
  return {
    frontmatter: parsed.data as SeedFileData["frontmatter"],
    content: parsed.content.trim(),
  }
}

// ---------------------------------------------------------------------------
// 3.5 删除种子文件
// ---------------------------------------------------------------------------

/**
 * 删除种子对应的 Markdown 文件。
 * 文件不存在时静默忽略（幂等）。
 */
export async function deleteSeedFile(
  userId: string,
  seedId: string,
  createdAt: number
): Promise<void> {
  const filePath = getSeedFilePath(userId, seedId, createdAt)
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === "ENOENT") return
    throw err
  }
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err
}
