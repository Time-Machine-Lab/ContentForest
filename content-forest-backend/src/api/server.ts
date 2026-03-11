import type { IncomingMessage, ServerResponse } from "node:http"

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode
  response.setHeader("content-type", "application/json; charset=utf-8")
  response.end(JSON.stringify(payload))
}

export function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  const { method, url } = request
  if (method === "GET" && url === "/health") {
    sendJson(response, 200, { status: "ok" })
    return
  }

  sendJson(response, 404, { message: "Not Found" })
}
