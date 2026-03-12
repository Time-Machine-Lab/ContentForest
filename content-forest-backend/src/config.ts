import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Root directory of the project (one level above src/) */
const PROJECT_ROOT = path.resolve(__dirname, "..")

/** Redis connection config */
export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"

/**
 * Data root directory for all content-forest file storage.
 * Defaults to <project_root>/cf/data, overridable via CF_DATA_ROOT env var.
 */
export const CF_DATA_ROOT =
  process.env.CF_DATA_ROOT ?? path.join(PROJECT_ROOT, "cf", "data")

/** Default user ID for MVP single-user mode */
export const DEFAULT_USER_ID = "local_admin"

/** REST API port */
export const PORT = Number(process.env.PORT ?? 4000)

/** MCP Server port (SSE) */
export const MCP_PORT = Number(process.env.MCP_PORT ?? 4001)
