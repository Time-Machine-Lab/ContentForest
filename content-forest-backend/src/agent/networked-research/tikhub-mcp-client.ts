import { NetworkProviderError } from "./provider-failure.js";

export interface TikhubMcpClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  clientName?: string;
  clientVersion?: string;
}

export interface TikhubMcpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface TikhubMcpPlatformInfo {
  slug: string;
  name: string;
  toolCount?: number;
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

const DEFAULT_BASE_URL = "https://mcp.tikhub.io";
const DEFAULT_TIMEOUT_MS = 60_000;
const MCP_ACCEPT_HEADER = "application/json, text/event-stream";
const MCP_PROTOCOL_VERSION = "2024-11-05";
const MAX_DIAGNOSTIC_CHARS = 1200;

export class TikhubMcpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly clientName: string;
  private readonly clientVersion: string;
  private readonly sessions = new Map<string, string>();

  public constructor(options: TikhubMcpClientOptions = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
    this.apiKey = options.apiKey?.trim() ?? "";
    this.timeoutMs = Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1000);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.clientName = options.clientName?.trim() || "content-forest";
    this.clientVersion = options.clientVersion?.trim() || "0.1.0";
  }

  public get configured(): boolean {
    return this.baseUrl.length > 0 && this.apiKey.length > 0;
  }

  public async health(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const value = await this.fetchJson(`${this.baseUrl}/health`, signal);
    return readRecord(value);
  }

  public async listPlatforms(signal?: AbortSignal): Promise<TikhubMcpPlatformInfo[]> {
    const value = await this.fetchJson(`${this.baseUrl}/platforms`, signal);
    return readPlatforms(value);
  }

  public async listTools(
    platform: string,
    signal?: AbortSignal,
  ): Promise<TikhubMcpTool[]> {
    const result = await this.rpc(platform, "tools/list", {}, { signal });
    return readTools(result);
  }

  public async callTool(input: {
    platform: string;
    toolName: string;
    arguments?: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<unknown> {
    return this.rpc(
      input.platform,
      "tools/call",
      {
        name: input.toolName,
        arguments: input.arguments ?? {},
      },
      { signal: input.signal },
    );
  }

  public sessionFor(platform: string): string | undefined {
    return this.sessions.get(normalizePlatformSlug(platform));
  }

  private async rpc(
    platform: string,
    method: string,
    params: Record<string, unknown>,
    options: { signal?: AbortSignal; retried?: boolean } = {},
  ): Promise<unknown> {
    this.assertConfigured();
    const slug = normalizePlatformSlug(platform);
    if (!this.sessions.has(slug)) {
      await this.initialize(slug, options.signal);
    }
    try {
      return await this.postRpc(slug, {
        jsonrpc: "2.0",
        id: createRpcId(method),
        method,
        params,
      }, options.signal);
    } catch (error) {
      if (!options.retried && isSessionFailure(error)) {
        this.sessions.delete(slug);
        await this.initialize(slug, options.signal);
        return this.rpc(platform, method, params, {
          ...options,
          retried: true,
        });
      }
      throw error;
    }
  }

  private async initialize(platform: string, signal?: AbortSignal): Promise<void> {
    const result = await this.postRpc(platform, {
      jsonrpc: "2.0",
      id: createRpcId("initialize"),
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: this.clientName,
          version: this.clientVersion,
        },
      },
    }, signal);
    if (typeof result !== "object" && result !== null) {
      return;
    }
  }

  private async postRpc(
    platform: string,
    body: Record<string, unknown>,
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        accept: MCP_ACCEPT_HEADER,
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      };
      const sessionId = this.sessions.get(platform);
      if (sessionId !== undefined) {
        headers["mcp-session-id"] = sessionId;
      }
      const response = await this.fetchImpl(`${this.baseUrl}/${platform}/mcp`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      const responseSessionId = response.headers.get("mcp-session-id");
      if (responseSessionId !== null && responseSessionId.trim().length > 0) {
        this.sessions.set(platform, responseSessionId.trim());
      }
      if (response.status === 401 || response.status === 403) {
        throw new NetworkProviderError(
          "missing_api_key",
          "TikHub MCP rejected the API key or authorization header",
        );
      }
      if (response.status === 404) {
        throw new NetworkProviderError(
          "provider_unavailable",
          `TikHub MCP platform endpoint was not found: ${platform}`,
        );
      }
      if (response.status === 429) {
        throw new NetworkProviderError(
          "quota_exceeded",
          "TikHub MCP quota or rate limit exceeded",
        );
      }
      if (!response.ok) {
        throw new NetworkProviderError(
          inferMcpHttpFailureCode(response.status),
          `TikHub MCP returned HTTP ${response.status}`,
        );
      }
      const rpcResponse = await parseRpcResponse(response);
      if (rpcResponse.error !== undefined) {
        throw new NetworkProviderError(
          inferMcpErrorCode(rpcResponse.error.message ?? "", rpcResponse.error.code),
          sanitizeTikhubDiagnostic(rpcResponse.error.message ?? "TikHub MCP tool call failed"),
        );
      }
      return rpcResponse.result;
    } catch (error) {
      if (error instanceof NetworkProviderError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new NetworkProviderError("timeout", "TikHub MCP request timed out");
      }
      const message = error instanceof Error ? error.message : "TikHub MCP request failed";
      throw new NetworkProviderError("network_error", sanitizeTikhubDiagnostic(message));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }

  private async fetchJson(url: string, signal: AbortSignal | undefined): Promise<unknown> {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new NetworkProviderError(
          inferMcpHttpFailureCode(response.status),
          `TikHub endpoint returned HTTP ${response.status}`,
        );
      }
      return response.json() as Promise<unknown>;
    } catch (error) {
      if (error instanceof NetworkProviderError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new NetworkProviderError("timeout", "TikHub endpoint request timed out");
      }
      const message = error instanceof Error ? error.message : "TikHub endpoint request failed";
      throw new NetworkProviderError("network_error", sanitizeTikhubDiagnostic(message));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }

  private assertConfigured(): void {
    if (this.baseUrl.length === 0) {
      throw new NetworkProviderError(
        "provider_unavailable",
        "TikHub MCP base URL is not configured",
      );
    }
    if (this.apiKey.length === 0) {
      throw new NetworkProviderError(
        "missing_api_key",
        "TikHub MCP API key is not configured",
      );
    }
  }
}

export function sanitizeTikhubDiagnostic(
  value: string,
  maxLength: number = MAX_DIAGNOSTIC_CHARS,
): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted-secret]")
    .replace(/(authorization|api[_-]?key|mcp-session-id)\s*[:=]\s*["']?[^"'\s;]{8,}/gi, "$1=[redacted-secret]")
    .replace(/\b[A-Za-z0-9_+/=-]{48,}\b/g, "[redacted-secret]")
    .slice(0, maxLength);
}

function readTools(value: unknown): TikhubMcpTool[] {
  const record = readRecord(value);
  const tools = Array.isArray(record.tools) ? record.tools : [];
  const result: TikhubMcpTool[] = [];
  for (const tool of tools) {
    const item = readRecord(tool);
    const name = readString(item.name);
    if (name.length === 0) {
      continue;
    }
    result.push({
      name,
      description: readOptionalString(item.description),
      inputSchema: readRecord(item.inputSchema),
    });
  }
  return result;
}

function readPlatforms(value: unknown): TikhubMcpPlatformInfo[] {
  const root = readRecord(value);
  const candidates = firstArray([
    value,
    root.platforms,
    root.data,
    readRecord(root.data).platforms,
  ]);
  const result: TikhubMcpPlatformInfo[] = [];
  for (const candidate of candidates) {
    const record = readRecord(candidate);
    const slug = normalizePlatformSlug(
      readString(record.slug) ||
      readString(record.id) ||
      readString(record.key) ||
      readString(record.name),
    );
    if (slug.length === 0) {
      continue;
    }
    result.push({
      slug,
      name: readString(record.name) || slug,
      toolCount: readNumber(record.tool_count) ?? readNumber(record.toolCount),
    });
  }
  return result;
}

async function parseRpcResponse(response: Response): Promise<JsonRpcResponse> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const text = await response.text();
  const payload = contentType.includes("text/event-stream")
    ? extractSseJson(text)
    : text;
  try {
    return readRecord(JSON.parse(payload)) as JsonRpcResponse;
  } catch {
    throw new NetworkProviderError(
      "network_error",
      `TikHub MCP returned non-JSON response: ${sanitizeTikhubDiagnostic(payload)}`,
    );
  }
}

function extractSseJson(value: string): string {
  const dataLines = value
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .filter((line) => line.length > 0 && line !== "[DONE]");
  return dataLines[0] ?? value;
}

function isSessionFailure(error: unknown): boolean {
  if (!(error instanceof NetworkProviderError)) {
    return false;
  }
  const text = error.message.toLowerCase();
  return /session|mcp-session-id|initialized|initialize/.test(text);
}

function inferMcpHttpFailureCode(status: number): NetworkProviderError["failureCode"] {
  if (status === 408 || status === 504) {
    return "timeout";
  }
  if (status >= 500) {
    return "provider_unavailable";
  }
  return "network_error";
}

function inferMcpErrorCode(
  message: string,
  code: number | undefined,
): NetworkProviderError["failureCode"] {
  const normalized = message.toLowerCase();
  if (code === -32001 || /api key|authorization|unauthorized|forbidden/.test(normalized)) {
    return "missing_api_key";
  }
  if (/quota|rate limit|too many requests|额度|频率/.test(normalized)) {
    return "quota_exceeded";
  }
  if (/session|mcp-session-id|initialize|initialized/.test(normalized)) {
    return "provider_error";
  }
  if (/not found|unknown tool|tool.*unavailable|unsupported/.test(normalized)) {
    return "provider_unavailable";
  }
  return "provider_error";
}

function firstArray(values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  const text = readString(value);
  return text.length > 0 ? text : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function createRpcId(method: string): string {
  return `${method}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePlatformSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/u, "");
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
