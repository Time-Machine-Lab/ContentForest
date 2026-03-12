/**
 * MCP Server 初始化
 *
 * 使用 @modelcontextprotocol/sdk 的 HTTP SSE 模式（宪法决策 #8）。
 * 与 REST API Server 共享同一进程，复用 SeedService（宪法 1.3/1.5）。
 *
 * 端口：MCP_PORT（默认 4001），路径：GET /sse + POST /message
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
import type { SeedService } from "../services/seed-service.js"
import { z } from "zod"

export function createMcpServer(service: SeedService): McpServer {
  const server = new McpServer({
    name: "content-forest",
    version: "0.1.0",
  })

  const handlers = createSeedToolHandlers(service)

  // -------------------------------------------------------------------------
  // 注册工具 (7.3)
  // -------------------------------------------------------------------------

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
      const result = await handlers.save_draft(args)
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
      const result = await handlers.publish_seed(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "archive_seed",
    "归档种子，将状态变为 archived。归档后不再被生成器扫描。",
    {
      seedId: z.string().min(1).describe("种子 ID"),
    },
    async (args) => {
      const result = await handlers.archive_seed(args)
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
      const result = await handlers.list_seeds(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "get_seed",
    "获取种子完整信息，包含 Markdown 正文内容。生成果实前调用此工具读取种子详情。",
    {
      seedId: z.string().min(1).describe("种子 ID"),
    },
    async (args) => {
      const result = await handlers.get_seed(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  server.tool(
    "update_seed_info",
    "更新种子的内容信息（title/content/tags）。不支持修改状态，状态变更请使用专用工具。",
    {
      seedId: z.string().min(1).describe("种子 ID"),
      title: z.string().optional().describe("新标题"),
      content: z.string().optional().describe("新正文内容"),
      tags: z.array(z.string()).optional().describe("新标签列表"),
    },
    async (args) => {
      const result = await handlers.update_seed_info(args)
      return { content: [{ type: "text", text: JSON.stringify(result) }] }
    }
  )

  return server
}

// ---------------------------------------------------------------------------
// SSE 传输层 — 处理 HTTP 请求路由
// ---------------------------------------------------------------------------

/** 每个 SSE 连接对应一个 transport 实例，用 sessionId 索引 */
const transports = new Map<string, SSEServerTransport>()

export async function handleMcpRequest(
  mcpServer: McpServer,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  // GET /sse — 建立 SSE 连接
  if (req.method === "GET" && pathname === "/sse") {
    const transport = new SSEServerTransport("/message", res)
    transports.set(transport.sessionId, transport)
    res.on("close", () => {
      transports.delete(transport.sessionId)
    })
    await mcpServer.connect(transport)
    return true
  }

  // POST /message — 接收客户端消息
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
