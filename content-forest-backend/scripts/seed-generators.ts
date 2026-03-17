/**
 * 平台官方生成器预置数据种子脚本
 *
 * 运行方式：npx tsx scripts/seed-generators.ts
 * 将官方示例生成器写入 Redis（cf:gen:{id}:meta + cf:market:gens）
 * 并将 Skill 文件复制到平台 Skill 目录。
 */

import "dotenv/config"
import path from "node:path"
import fs from "node:fs/promises"
import { redis } from "../src/storage/redis-client.js"
import { RedisGeneratorRepository } from "../src/repositories/redis-generator-repository.js"
import { writePlatformSkillFiles } from "../src/storage/generator-fs.js"
import type { GeneratorMetadata } from "../src/domain/generator.js"

const genRepo = new RedisGeneratorRepository()

// 官方示例生成器列表
const OFFICIAL_GENERATORS: GeneratorMetadata[] = [
  {
    id: "gen_official_xhs_graphic",
    name: "小红书图文生成器",
    description: "将种子想法转化为符合小红书平台规范的爆款图文帖子，含标题、正文、话题标签。",
    platform: "xiaohongshu",
    contentTypes: ["图文"],
    domain: "通用",
    author: "content-forest-official",
    outputCapabilities: ["小红书图文帖子", "爆款标题", "话题标签"],
    price: 0,
    installCount: 0,
    rating: 5,
    ratingCount: 1,
    tags: ["小红书", "图文", "官方", "通用"],
    visibility: "public",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

// 技能文件所在目录（项目 skills 目录）
const SKILLS_BASE = path.resolve(process.cwd(), "..", "content-forest-agent", "skills")

async function seedGenerators() {
  console.log("🌱 Seeding official generators...")

  for (const gen of OFFICIAL_GENERATORS) {
    // 读取 Skill 文件
    const skillName = gen.id.replace("gen_official_", "").replace(/_/g, "-")
    // map id → skill folder name
    const skillFolderMap: Record<string, string> = {
      gen_official_xhs_graphic: "xiaohongshu-graphic",
    }
    const skillFolder = skillFolderMap[gen.id] ?? skillName
    const skillDir = path.join(SKILLS_BASE, skillFolder)

    const files = new Map<string, Buffer>()
    try {
      await collectFiles(skillDir, skillDir, files)
    } catch {
      console.warn(`  ⚠️  Skill dir not found: ${skillDir}, skipping file copy`)
    }

    // 写入平台 Skill 目录
    if (files.size > 0) {
      await writePlatformSkillFiles(gen.id, files)
      console.log(`  ✓ Skill files written for ${gen.id} (${files.size} files)`)
    }

    // 写入 Redis
    await genRepo.save(gen)
    console.log(`  ✓ Redis metadata saved: ${gen.name} (${gen.id})`)
  }

  console.log("\n✅ Done. Official generators seeded.")
  await redis.quit()
}

async function collectFiles(base: string, dir: string, out: Map<string, Buffer>) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      await collectFiles(base, full, out)
    } else {
      const rel = path.relative(base, full)
      out.set(rel, await fs.readFile(full))
    }
  }
}

seedGenerators().catch(err => {
  console.error("❌ Seed failed:", err)
  process.exit(1)
})
