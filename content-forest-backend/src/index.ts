import { createServer } from "node:http"
import { handleRequest } from "./api/server.js"

const port = Number(process.env.PORT || 4000)

const server = createServer(handleRequest)

server.listen(port, () => {
  process.stdout.write(`content-forest-backend listening on http://localhost:${port}\n`)
})
