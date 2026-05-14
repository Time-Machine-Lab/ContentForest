import { createPublicKey, randomUUID, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NetworkProviderError } from "../provider-failure.js";
import type {
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";
import {
  buildExternalResearchInput,
  buildExternalResearchInstructions,
  mapExternalItem,
  parseExternalResearchOutput,
} from "./codex-external-research-provider.js";

export interface OpenClawExternalResearchProviderOptions {
  enabled?: boolean;
  gatewayUrl?: string;
  authToken?: string;
  timeoutMs?: number;
  sessionPrefix?: string;
  deleteSessionOnFinish?: boolean;
  client?: OpenClawGatewayClient;
  now?: () => Date;
}

export interface OpenClawGatewayClient {
  runAgent(input: OpenClawAgentRequest): Promise<unknown>;
  deleteSession(sessionKey: string): Promise<void>;
}

export interface OpenClawAgentRequest {
  message: string;
  sessionKey: string;
  runId: string;
  timeoutMs: number;
}

interface OpenClawWebSocket {
  send(data: string): void;
  close(): void;
  addEventListener(
    type: "open" | "message" | "error" | "close",
    listener: (event: unknown) => void,
    options?: { once?: boolean },
  ): void;
}

interface OpenClawWebSocketConstructor {
  new(url: string): OpenClawWebSocket;
}

interface JsonRpcResponse {
  type?: string;
  id?: number | string;
  ok?: boolean;
  result?: unknown;
  payload?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}

interface OpenClawEventFrame {
  type?: string;
  event?: string;
  payload?: unknown;
}

interface OpenClawDeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

const OPENCLAW_PROTOCOL_VERSION = 3;
const OPENCLAW_CONNECT_SCOPES = ["operator.admin"];
const OPENCLAW_CLIENT_ID = "gateway-client";
const OPENCLAW_CLIENT_MODE = "backend";

export class OpenClawExternalResearchProvider implements NetworkProvider {
  public readonly name = "openclaw_external_research";

  private readonly enabled: boolean;
  private readonly gatewayUrl: string;
  private readonly authToken: string;
  private readonly timeoutMs: number;
  private readonly sessionPrefix: string;
  private readonly deleteSessionOnFinish: boolean;
  private readonly client: OpenClawGatewayClient | null;
  private readonly now: () => Date;

  public constructor(options: OpenClawExternalResearchProviderOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.gatewayUrl = options.gatewayUrl?.trim() ?? "";
    this.authToken = options.authToken?.trim() ?? "";
    this.timeoutMs = Math.max(options.timeoutMs ?? 180000, 1000);
    this.sessionPrefix = sanitizeSessionPart(options.sessionPrefix ?? "content-forest");
    this.deleteSessionOnFinish = options.deleteSessionOnFinish ?? true;
    this.client = options.client ?? null;
    this.now = options.now ?? (() => new Date());
  }

  public canResearch(_request: NetworkResearchRequest): boolean {
    return this.enabled;
  }

  public canObserve(_request: NetworkObserveRequest): boolean {
    return false;
  }

  public async research(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]> {
    this.assertConfigured();
    const sessionKey = this.createSessionKey();
    const runId = randomUUID();
    const client = this.getClient();
    const capturedAt = this.now().toISOString();
    const items: RawNetworkResearchItem[] = [];
    let mainError: NetworkProviderError | null = null;

    try {
      const output = await client.runAgent({
        sessionKey,
        runId,
        timeoutMs: this.timeoutMs,
        message: [
          buildExternalResearchInstructions(),
          "",
          "When browser extension capabilities are available, prioritize using the browser extension to search, open, and observe relevant platform pages before falling back to generic web search.",
          "Prefer direct platform/page observation evidence from the browser extension for cases, URLs, and engagement metrics; if the browser extension is blocked by login, captcha, safety limits, or unavailable tools, report that limitation explicitly.",
          "",
          "Return only the JSON research package. Do not include markdown fences.",
          "",
          buildExternalResearchInput(request, plan),
        ].join("\n"),
      });
      const parsed = parseExternalResearchOutput(
        extractOpenClawOutputText(output),
        "OpenClaw external research provider",
      );
      for (const item of parsed.items) {
        items.push(mapExternalItem(item, {
          capturedAt,
          platform: request.targetPlatform ?? plan.targetPlatform,
          providerName: this.name,
        }));
      }
      for (const block of parsed.depositableBlocks) {
        items.push({
          title: block.title,
          snippet: block.markdown,
          rawExcerpt: block.markdown,
          source: "OpenClaw external research",
          sourceDomain: "",
          platform: request.targetPlatform ?? plan.targetPlatform,
          capturedAt,
          providerName: this.name,
          phase: "initial_search",
          resultQuality: "candidate_lead",
        });
      }
      if (parsed.summary.trim().length > 0) {
        items.push({
          title: "OpenClaw 外部研究摘要",
          snippet: parsed.summary,
          rawExcerpt: parsed.summary,
          source: "OpenClaw external research",
          sourceDomain: "",
          platform: request.targetPlatform ?? plan.targetPlatform,
          capturedAt,
          providerName: this.name,
          phase: "initial_search",
          resultQuality: "candidate_lead",
        });
      }
      for (const limitation of parsed.limitations) {
        items.push({
          restrictedStatus: {
            code: limitation.code,
            reason: limitation.reason,
            providerName: this.name,
            phase: "initial_search",
            platform: request.targetPlatform ?? plan.targetPlatform,
            url: limitation.url,
            diagnosticExcerpt: truncate(limitation.reason, 320),
          },
        });
      }
    } catch (error) {
      mainError = toOpenClawProviderError(error);
    }

    const cleanupFailureReason = this.deleteSessionOnFinish
      ? await this.recordDeleteSessionFailure(client, sessionKey, items, mainError)
      : null;
    if (mainError !== null) {
      if (cleanupFailureReason !== null) {
        throw new NetworkProviderError(
          mainError.failureCode,
          `${mainError.message}; OpenClaw session cleanup failed: ${cleanupFailureReason}`,
        );
      }
      throw mainError;
    }
    return items;
  }

  public configSummary(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      gatewayUrlConfigured: this.gatewayUrl.length > 0,
      authTokenConfigured: this.authToken.length > 0,
      timeoutMs: this.timeoutMs,
      sessionPrefix: this.sessionPrefix,
      deleteSessionOnFinish: this.deleteSessionOnFinish,
    };
  }

  private createSessionKey(): string {
    return `${this.sessionPrefix}:${Date.now()}-${randomUUID().slice(0, 8)}`;
  }

  private getClient(): OpenClawGatewayClient {
    return this.client ?? new JsonRpcOpenClawGatewayClient({
      gatewayUrl: this.gatewayUrl,
      authToken: this.authToken,
      timeoutMs: this.timeoutMs,
    });
  }

  private assertConfigured(): void {
    if (!this.enabled) {
      throw new NetworkProviderError("provider_unavailable", "OpenClaw external research provider is disabled");
    }
    if (this.gatewayUrl.length === 0) {
      throw new NetworkProviderError(
        "provider_unavailable",
        "OpenClaw external research Gateway URL is not configured",
      );
    }
    if (this.authToken.length === 0) {
      throw new NetworkProviderError(
        "missing_api_key",
        "OpenClaw external research auth token is not configured",
      );
    }
  }

  private async recordDeleteSessionFailure(
    client: OpenClawGatewayClient,
    sessionKey: string,
    items: RawNetworkResearchItem[],
    mainError: NetworkProviderError | null,
  ): Promise<string | null> {
    try {
      await client.deleteSession(sessionKey);
      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "OpenClaw session cleanup failed";
      const reason = sanitizeOpenClawMessage(message);
      if (mainError === null) {
        items.push({
          restrictedStatus: {
            code: "unknown",
            reason: `OpenClaw session cleanup failed: ${reason}`,
            providerName: this.name,
            phase: "initial_search",
            diagnosticExcerpt: truncate(reason, 320),
          },
        });
      }
      return reason;
    }
  }
}

export class JsonRpcOpenClawGatewayClient implements OpenClawGatewayClient {
  private readonly gatewayUrl: string;
  private readonly authToken: string;
  private readonly timeoutMs: number;
  private readonly webSocketFactory: OpenClawWebSocketConstructor;

  public constructor(options: {
    gatewayUrl: string;
    authToken: string;
    timeoutMs?: number;
    webSocketFactory?: OpenClawWebSocketConstructor;
  }) {
    this.gatewayUrl = options.gatewayUrl.trim();
    this.authToken = options.authToken.trim();
    this.timeoutMs = Math.max(options.timeoutMs ?? 180000, 1000);
    this.webSocketFactory = options.webSocketFactory ?? getGlobalWebSocketFactory();
  }

  public async runAgent(input: OpenClawAgentRequest): Promise<unknown> {
    const accepted = await this.callWithConnectedGateway(
      "agent",
      {
        message: input.message,
        sessionKey: input.sessionKey,
        deliver: false,
        timeout: input.timeoutMs,
        idempotencyKey: input.runId,
        label: "ContentForest networked research",
      },
      input.timeoutMs,
    );
    const acceptedRecord = asRecord(accepted);
    const runId = readOptionalString(acceptedRecord?.runId)
      ?? readOptionalString(acceptedRecord?.id)
      ?? readOptionalString(acceptedRecord?.messageId);

    if (runId === null) {
      const directOutput = extractDirectOutput(accepted);
      if (directOutput.length > 0) {
        return directOutput;
      }
      throw new NetworkProviderError(
        "provider_error",
        "OpenClaw did not return a run id for the accepted research request",
      );
    }

    const waitResult = await this.callWithConnectedGateway(
      "agent.wait",
      {
        runId,
        timeoutMs: input.timeoutMs,
      },
      input.timeoutMs + 10000,
    );
    const waitRecord = asRecord(waitResult);
    const status = readOptionalString(waitRecord?.status);
    if (status !== null && !isSuccessfulOpenClawRunStatus(status)) {
      throw new NetworkProviderError(
        "provider_error",
        readOptionalString(waitRecord?.error)
          ?? `OpenClaw research run did not complete successfully (status: ${status})`,
      );
    }

    const history = await this.callWithConnectedGateway(
      "chat.history",
      {
        sessionKey: input.sessionKey,
        limit: 100,
      },
      Math.min(input.timeoutMs, 30000),
    );
    return extractAssistantMessageFromHistory(history);
  }

  public async deleteSession(sessionKey: string): Promise<void> {
    await this.callWithConnectedGateway(
      "sessions.delete",
      { key: sessionKey },
      this.timeoutMs,
    );
  }

  private async callWithConnectedGateway(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<unknown> {
    const socket = new this.webSocketFactory(this.gatewayUrl);
    let nextId = 1;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      await waitForSocketOpen(socket, timeoutMs);
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          try {
            socket.close();
          } catch {
            // Best effort close on timeout.
          }
          reject(new NetworkProviderError("timeout", "OpenClaw Gateway request timed out"));
        }, timeoutMs);
      });
      const challenge = waitForOpenClawEvent(socket, "connect.challenge");
      const challengeFrame = await Promise.race([challenge, timeoutPromise]);
      const connect = sendJsonRpc(
        socket,
        nextId++,
        "connect",
        await buildOpenClawConnectParams(this.authToken, challengeFrame),
      );
      await Promise.race([connect, timeoutPromise]);
      const result = sendJsonRpc(socket, nextId++, method, params);
      return await Promise.race([result, timeoutPromise]);
    } finally {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      try {
        socket.close();
      } catch {
        // The call is already finished or failed; close is best effort.
      }
    }
  }
}

function sendJsonRpc(
  socket: OpenClawWebSocket,
  id: number,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: unknown): void => {
      const response = readJsonRpcResponse(event);
      if (String(response.id) !== String(id)) {
        return;
      }
      if (response.error !== undefined) {
        reject(new NetworkProviderError(
          "provider_error",
          response.error.message ?? `OpenClaw Gateway ${method} failed`,
        ));
        return;
      }
      if (response.ok === false) {
        reject(new NetworkProviderError(
          "provider_error",
          `OpenClaw Gateway ${method} failed`,
        ));
        return;
      }
      resolve(response.result ?? response.payload);
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", () => {
      reject(new NetworkProviderError("network_error", "OpenClaw Gateway socket error"));
    }, { once: true });
    socket.send(JSON.stringify({
      type: "req",
      id: String(id),
      method,
      params,
    }));
  });
}

function waitForOpenClawEvent(
  socket: OpenClawWebSocket,
  eventName: string,
): Promise<OpenClawEventFrame> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: unknown): void => {
      const frame = readOpenClawEventFrame(event);
      if (frame.type === "event" && frame.event === eventName) {
        resolve(frame);
      }
    };
    socket.addEventListener("message", onMessage);
    socket.addEventListener("error", () => {
      reject(new NetworkProviderError("network_error", "OpenClaw Gateway socket error"));
    }, { once: true });
  });
}

async function buildOpenClawConnectParams(
  authToken: string,
  challengeFrame: OpenClawEventFrame,
): Promise<Record<string, unknown>> {
  const nonce = readChallengeNonce(challengeFrame);
  const deviceIdentity = await loadLocalOpenClawDeviceIdentity();
  const params: Record<string, unknown> = {
    minProtocol: OPENCLAW_PROTOCOL_VERSION,
    maxProtocol: OPENCLAW_PROTOCOL_VERSION,
    role: "operator",
    scopes: OPENCLAW_CONNECT_SCOPES,
    auth: {
      token: authToken,
    },
    client: {
      id: OPENCLAW_CLIENT_ID,
      displayName: "ContentForest",
      version: "1.0.0",
      platform: "node",
      mode: OPENCLAW_CLIENT_MODE,
      instanceId: "content-forest",
    },
    caps: [],
  };

  if (deviceIdentity === null) {
    return params;
  }

  const signedAt = Date.now();
  const payload = buildDeviceAuthPayload({
    deviceId: deviceIdentity.deviceId,
    clientId: OPENCLAW_CLIENT_ID,
    clientMode: OPENCLAW_CLIENT_MODE,
    role: "operator",
    scopes: OPENCLAW_CONNECT_SCOPES,
    signedAtMs: signedAt,
    token: authToken,
    nonce,
  });
  params.device = {
    id: deviceIdentity.deviceId,
    publicKey: toOpenClawPublicKey(deviceIdentity.publicKeyPem),
    signature: sign(null, Buffer.from(payload), deviceIdentity.privateKeyPem)
      .toString("base64url"),
    signedAt,
    nonce,
  };
  return params;
}

function waitForSocketOpen(
  socket: OpenClawWebSocket,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Best effort close on timeout.
      }
      reject(new NetworkProviderError("timeout", "OpenClaw Gateway connection timed out"));
    }, timeoutMs);
    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new NetworkProviderError("network_error", "OpenClaw Gateway connection failed"));
    }, { once: true });
  });
}

function readJsonRpcResponse(event: unknown): JsonRpcResponse {
  const data = typeof event === "object" && event !== null && "data" in event
    ? (event as { data?: unknown }).data
    : event;
  const text = typeof data === "string"
    ? data
    : data instanceof Uint8Array
      ? new TextDecoder().decode(data)
      : "";
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? parsed as JsonRpcResponse
      : {};
  } catch {
    return {};
  }
}

function readOpenClawEventFrame(event: unknown): OpenClawEventFrame {
  const data = typeof event === "object" && event !== null && "data" in event
    ? (event as { data?: unknown }).data
    : event;
  const text = typeof data === "string"
    ? data
    : data instanceof Uint8Array
      ? new TextDecoder().decode(data)
      : "";
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? parsed as OpenClawEventFrame
      : {};
  } catch {
    return {};
  }
}

function readChallengeNonce(frame: OpenClawEventFrame): string {
  const payload = asRecord(frame.payload);
  const nonce = payload?.nonce;
  if (typeof nonce !== "string" || nonce.trim().length === 0) {
    throw new NetworkProviderError(
      "provider_error",
      "OpenClaw Gateway did not provide a websocket challenge nonce",
    );
  }
  return nonce;
}

function buildDeviceAuthPayload(input: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string;
  nonce: string;
}): string {
  return [
    "v2",
    input.deviceId,
    input.clientId,
    input.clientMode,
    input.role,
    input.scopes.join(","),
    String(input.signedAtMs),
    input.token,
    input.nonce,
  ].join("|");
}

function toOpenClawPublicKey(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const der = key.export({ format: "der", type: "spki" });
  return Buffer.from(der).subarray(-32).toString("base64url");
}

async function loadLocalOpenClawDeviceIdentity(): Promise<OpenClawDeviceIdentity | null> {
  const homeDirectory =
    process.env.OPENCLAW_HOME ??
    process.env.USERPROFILE ??
    process.env.HOME;
  if (!homeDirectory) {
    return null;
  }
  try {
    const raw = await readFile(
      join(homeDirectory, ".openclaw", "identity", "device.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed.deviceId !== "string" ||
      typeof parsed.publicKeyPem !== "string" ||
      typeof parsed.privateKeyPem !== "string"
    ) {
      return null;
    }
    return {
      deviceId: parsed.deviceId,
      publicKeyPem: parsed.publicKeyPem,
      privateKeyPem: parsed.privateKeyPem,
    };
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function isSuccessfulOpenClawRunStatus(status: string): boolean {
  return ["ok", "success", "succeeded", "completed", "done"].includes(status.toLowerCase());
}

function extractDirectOutput(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const record = asRecord(value);
  return readOptionalString(record?.outputText)
    ?? readOptionalString(record?.output)
    ?? readOptionalString(record?.text)
    ?? readOptionalString(record?.message)
    ?? readContentText(record?.content)
    ?? "";
}

function extractAssistantMessageFromHistory(value: unknown): string {
  const record = asRecord(value);
  const messages = Array.isArray(record?.messages) ? record.messages : [];
  for (const message of [...messages].reverse()) {
    const messageRecord = asRecord(message);
    if (messageRecord?.role === "assistant") {
      const content = readOptionalString(messageRecord.content)
        ?? readContentText(messageRecord.content);
      if (content !== null) {
        return content;
      }
    }
  }
  throw new NetworkProviderError(
    "provider_error",
    "OpenClaw research run completed but no assistant output was found",
  );
}

function extractOpenClawOutputText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const record = readRecord(value);
  const directText =
    readString(record.output_text) ||
    readString(record.outputText) ||
    readString(record.text) ||
    readString(record.message) ||
    readString(record.content) ||
    (readContentText(record.content) ?? "") ||
    readString(record.response);
  if (directText.length > 0) {
    return directText;
  }
  const output = readArray(record.output);
  const parts: string[] = [];
  for (const item of output) {
    const itemRecord = readRecord(item);
    for (const content of readArray(itemRecord.content)) {
      const contentRecord = readRecord(content);
      const text = readString(contentRecord.text);
      if (text.length > 0) {
        parts.push(text);
      }
    }
  }
  const text = parts.join("\n").trim();
  if (text.length === 0) {
    throw new NetworkProviderError(
      "empty_result",
      "OpenClaw external research provider returned empty output",
    );
  }
  return text;
}

function readContentText(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parts: string[] = [];
  for (const part of value) {
    const partRecord = asRecord(part);
    if (partRecord === null) {
      continue;
    }
    if (partRecord.type === "thinking") {
      continue;
    }
    const text = readOptionalString(partRecord.text)
      ?? readOptionalString(partRecord.content);
    if (text !== null) {
      parts.push(text);
    }
  }
  const text = parts.join("\n").trim();
  return text.length > 0 ? text : null;
}

function getGlobalWebSocketFactory(): OpenClawWebSocketConstructor {
  const factory = (globalThis as { WebSocket?: OpenClawWebSocketConstructor }).WebSocket;
  if (factory === undefined) {
    throw new NetworkProviderError(
      "provider_unavailable",
      "OpenClaw Gateway requires a global WebSocket runtime",
    );
  }
  return factory;
}

function inferOpenClawFailureCode(
  message: string,
): "provider_unavailable" | "network_error" | "timeout" | "provider_error" | "empty_result" {
  const normalized = message.toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "timeout";
  }
  if (normalized.includes("empty")) {
    return "empty_result";
  }
  if (normalized.includes("websocket") || normalized.includes("gateway") || normalized.includes("network")) {
    return "network_error";
  }
  return "provider_error";
}

function toOpenClawProviderError(error: unknown): NetworkProviderError {
  if (error instanceof NetworkProviderError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "OpenClaw external research failed";
  return new NetworkProviderError(inferOpenClawFailureCode(message), message);
}

function sanitizeSessionPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return normalized.length > 0 ? normalized.slice(0, 48) : "content-forest";
}

function sanitizeOpenClawMessage(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted-secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-secret]")
    .slice(0, 320);
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
