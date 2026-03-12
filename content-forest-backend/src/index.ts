import "dotenv/config"
import { createServer } from "node:http"
import { handleRequest } from "./api/server.js"
import { PORT } from "./config.js"

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err: unknown) => {
    res.statusCode = 500
    res.end(JSON.stringify({ message: String(err) }))
  })
})

server.listen(PORT, () => {
  process.stdout.write(
    `content-forest-backend listening on http://localhost:${PORT}\n` +
    `MCP SSE endpoint: http://localhost:${PORT}/sse\n`
  )
})
