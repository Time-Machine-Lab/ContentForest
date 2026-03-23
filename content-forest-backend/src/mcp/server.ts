/**
 * MCP Server 初始化
 *
 * 注册种子工具 + 生成器工具。
 * 使用 @modelcontextprotocol/sdk 的 HTTP SSE 模式。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import type { IncomingMessage, ServerResponse } from "node:http"
import { createSeedToolHandlers } from "./seed-tools.js"
import {
  SaveDraftSchema,
  PublishSeedSchema,
  ArchiveSeedSchema,
  ListSeedsSchema,
  GetSeedSchema,
  UpdateSeedInfoSchema,
} from "./seed-tools.js"
import { createGeneratorToolHandlers } from "./generator-tools.js"
import type { SeedService } from "../services/seed-service.js"
import type { GeneratorService } from "../services/generator-service.js"
import { z } from "zod"

export function createMcpServer(
  seedService: SeedService,
  generatorService?: GeneratorService
): McpServer {
  const server = new McpServer({
    name: "content-forest",
    version: "0.1.0",
  })

  const seedHandlers = createSeedToolHandlers(seedService)

  // ── 种子工具 ──────────────────────────────────────────────────────────────

  server.tool(
    "save_draft",
    "保存草稿种子。可创建新草稿（不传 id）或更新已有草稿（传 id）。",
    {
      title: z.string().min(1).describe("种子标题"),
      content: z.string().min(1).describe("Markdown 正文内容"),
      tags: z.array(z.string()).optional().describe("标签列表"),
      id: z.string().optional().describe("已有草稿 ID（upsert 时传入）"),
    },
    async (args) => {
      const result = await seedHandlers.save_draft(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "publish_seed",
    "发布种子，将状态变为 active。可传 id 发布已有草稿，或直接传 title+content 创建并发布。",
    {
      id: z.string().optional().describe("已有草稿 ID"),
      title: z.string().optional().describe("标题（直接发布时必填）"),
      content: z.string().optional().describe("正文（直接发布时必填）"),
      tags: z.array(z.string()).optional().describe("标签列表"),
    },
    async (args) => {
      const result = await seedHandlers.publish_seed(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "archive_seed",
    "归档种子，将状态变为 archived。",
    { seedId: z.string().min(1).describe("种子 ID") },
    async (args) => {
      const result = await seedHandlers.archive_seed(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "list_seeds",
    "查询种子列表（仅元数据，不含正文）。支持按 status 过滤和分页。",
    {
      status: z.enum(["draft", "active", "archived"]).optional().describe("状态过滤"),
      tags: z.array(z.string()).optional().describe("标签过滤（AND 条件）"),
      page: z.number().int().positive().optional().describe("页码，默认 1"),
      size: z.number().int().positive().max(100).optional().describe("每页数量，默认 20"),
    },
    async (args) => {
      const result = await seedHandlers.list_seeds(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "get_seed",
    "获取种子完整信息，包含 Markdown 正文。生成果实前调用此工具。",
    { seedId: z.string().min(1).describe("种子 ID") },
    async (args) => {
      const result = await seedHandlers.get_seed(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "update_seed_info",
    "更新种子的内容信息（title/content/tags）。不支持修改状态。",
    {
      seedId: z.string().min(1).describe("种子 ID"),
      title: z.string().optional().describe("新标题"),
      content: z.string().optional().describe("新正文内容"),
      tags: z.array(z.string()).optional().describe("新标签列表"),
    },
    async (args) => {
      const result = await seedHandlers.update_seed_info(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  // ── 生成器工具 ────────────────────────────────────────────────────────────

  if (generatorService) {
    const genHandlers = createGeneratorToolHandlers(generatorService)

    server.tool(
      "get_generator",
      "获取生成器元数据及当前用户的本地 skillPath。Agent 执行生成前调用此工具确认 Skill 路径。",
      {
        generatorId: z.string().min(1).describe("生成器 ID"),
        userId: z.string().optional().describe("用户 ID，传入时返回该用户的 skillPath"),
      },
      async (args) => {
        const result = await genHandlers.get_generator(args)
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    )

    server.tool(
      "list_generators",
      "列出用户已安装的生成器列表。Agent 在生成前调用以选择合适的生成器。",
      {
        userId: z.string().min(1).describe("用户 ID"),
        filter: z.object({
          platform: z.enum(["xiaohongshu", "douyin", "twitter", "wechat", "other"]).optional().describe("平台过滤"),
          domain: z.string().optional().describe("领域过滤"),
          keyword: z.string().optional().describe("关键词搜索"),
        }).optional().describe("过滤条件"),
        page: z.number().int().positive().optional().describe("页码，默认 1"),
        pageSize: z.number().int().positive().max(100).optional().describe("每页数量，默认 20"),
      },
      async (args) => {
        const result = await genHandlers.list_generators(args)
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    )

    server.tool(
      "install_generator",
      "将市场生成器安装到用户本地，返回 skillPath 供 Agent 加载 Skill。",
      {
        userId: z.string().min(1).describe("用户 ID"),
        generatorId: z.string().min(1).describe("生成器 ID"),
      },
      async (args) => {
        const result = await genHandlers.install_generator(args)
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    )

    server.tool(
      "write_generation_log",
      "写入一次内容生成的完整日志（Redis + 本地文件双写）。生成完成后调用。",
      {
        userId: z.string().min(1).describe("用户 ID"),
        generatorId: z.string().min(1).describe("使用的生成器 ID"),
        seedId: z.string().optional().describe("关联种子 ID"),
        fruitId: z.string().optional().describe("关联果实 ID（再加工时填写）"),
        input: z.record(z.unknown()).optional().describe("生成输入参数"),
        output: z.string().min(1).describe("生成结果 Markdown 正文"),
        status: z.enum(["success", "failed"]).optional().describe("生成状态，默认 success"),
        error: z.string().optional().describe("错误信息（status=failed 时填写）"),
        durationMs: z.number().int().nonnegative().optional().describe("生成耗时（毫秒）"),
      },
      async (args) => {
        const result = await genHandlers.write_generation_log(args)
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    )

    server.tool(
      "get_nutrients",
      "读取用户营养库中的 Markdown 文件内容。文件不存在时返回 null 并附带 warning，不抛错。",
      {
        userId: z.string().min(1).describe("用户 ID"),
        paths: z.array(z.string().min(1)).min(1).describe("营养库文件相对路径列表（相对于用户营养库根目录）"),
      },
      async (args) => {
        const result = await genHandlers.get_nutrients(args)
        return { content: [{ type: "text", text: JSON.stringify(result) }] }
      }
    )
  }

  return server
}

// ---------------------------------------------------------------------------
// SSE 传输层
// ---------------------------------------------------------------------------

const transports = new Map<string, SSEServerTransport>()

export async function handleMcpRequest(
  mcpServer: McpServer,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  if (req.method === "GET" && pathname === "/sse") {
    const transport = new SSEServerTransport("/message", res)
    transports.set(transport.sessionId, transport)
    res.on("close", () => { transports.delete(transport.sessionId) })
    await mcpServer.connect(transport)
    return true
  }

  if (req.method === "POST" && pathname === "/message") {
    const qs = new URL(req.url ?? "/", "http://localhost").searchParams
    const sessionId = qs.get("sessionId") ?? ""
    const transport = transports.get(sessionId)
    if (!transport) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Unknown sessionId" }))
      return true
    }
    await transport.handlePostMessage(req, res)
    return true
  }

  return false
} 