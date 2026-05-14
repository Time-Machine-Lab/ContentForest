import { NetworkProviderError } from "../provider-failure.js";
import type {
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "../types.js";

export type CodexResearchReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type CodexResearchSearchContextSize = "low" | "medium" | "high";

export interface CodexExternalResearchProviderOptions {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  wireApi?: "responses";
  model?: string;
  reasoningEffort?: CodexResearchReasoningEffort;
  authMethod?: "api";
  webSearchEnabled?: boolean;
  searchContextSize?: CodexResearchSearchContextSize;
  timeoutMs?: number;
  maxOutputTokens?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface CodexResearchResponse {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  output_text?: string;
  error?: {
    message?: string;
  } | null;
  tool_usage?: {
    web_search?: {
      num_requests?: number;
    };
  };
}

export interface ExternalResearchOutput {
  summary: string;
  items: ExternalResearchItem[];
  depositableBlocks: ExternalResearchBlock[];
  limitations: ExternalResearchLimitation[];
}

export interface ExternalResearchItem {
  title: string;
  url?: string;
  snippet: string;
  source?: string;
  platform?: string;
  publishedAt?: string | null;
  observedEvidence?: string;
  engagement?: Record<string, unknown>;
  engagementJson?: string;
}

export interface ExternalResearchBlock {
  title: string;
  markdown: string;
}

export interface ExternalResearchLimitation {
  code: "provider_unavailable" | "restricted_by_login" | "restricted_by_captcha" | "access_denied" | "empty_result" | "timeout" | "unknown";
  reason: string;
  url?: string;
}

export class CodexExternalResearchProvider implements NetworkProvider {
  public readonly name = "codex_external_research";

  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly reasoningEffort: CodexResearchReasoningEffort;
  private readonly webSearchEnabled: boolean;
  private readonly searchContextSize: CodexResearchSearchContextSize;
  private readonly timeoutMs: number;
  private readonly maxOutputTokens: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  public constructor(options: CodexExternalResearchProviderOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? "");
    this.apiKey = options.apiKey?.trim() ?? "";
    this.model = options.model?.trim() ?? "gpt-5.5";
    this.reasoningEffort = normalizeReasoningEffort(options.reasoningEffort);
    this.webSearchEnabled = options.webSearchEnabled ?? true;
    this.searchContextSize = normalizeSearchContextSize(options.searchContextSize);
    this.timeoutMs = Math.max(options.timeoutMs ?? 180000, 1000);
    this.maxOutputTokens = Math.max(options.maxOutputTokens ?? 6000, 1);
    this.fetchImpl = options.fetchImpl ?? fetch;
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
    const startedAt = Date.now();
    const response = await this.fetchResponses(request, plan);
    const outputText = extractOutputText(response);
    const parsed = parseExternalResearchOutput(outputText);
    const capturedAt = this.now().toISOString();
    const items = parsed.items.map((item) =>
      mapExternalItem(item, {
        capturedAt,
        platform: request.targetPlatform ?? plan.targetPlatform,
        providerName: this.name,
      }),
    );
    for (const block of parsed.depositableBlocks) {
      items.push({
        title: block.title,
        snippet: block.markdown,
        rawExcerpt: block.markdown,
        source: "Codex external research",
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
        title: "Codex 外部研究摘要",
        snippet: parsed.summary,
        rawExcerpt: parsed.summary,
        source: "Codex external research",
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
    items.push({
      title: "Codex 外部研究调用摘要",
      snippet: [
        `model=${this.model}`,
        `wireApi=responses`,
        `webSearchRequests=${response.tool_usage?.web_search?.num_requests ?? 0}`,
        `durationMs=${Date.now() - startedAt}`,
      ].join("; "),
      rawExcerpt: "Codex external research provider invocation trace summary.",
      source: "Codex external research",
      sourceDomain: "",
      platform: request.targetPlatform ?? plan.targetPlatform,
      capturedAt,
      providerName: this.name,
      phase: "initial_search",
      resultQuality: "candidate_lead",
    });
    return items;
  }

  public configSummary(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      baseUrlConfigured: this.baseUrl.length > 0,
      apiKeyConfigured: this.apiKey.length > 0,
      model: this.model,
      wireApi: "responses",
      reasoningEffort: this.reasoningEffort,
      webSearchEnabled: this.webSearchEnabled,
      searchContextSize: this.searchContextSize,
      timeoutMs: this.timeoutMs,
      maxOutputTokens: this.maxOutputTokens,
    };
  }

  private assertConfigured(): void {
    if (!this.enabled) {
      throw new NetworkProviderError("provider_unavailable", "Codex external research provider is disabled");
    }
    if (this.baseUrl.length === 0 || this.model.length === 0) {
      throw new NetworkProviderError(
        "provider_unavailable",
        "Codex external research provider is not configured",
      );
    }
    if (this.apiKey.length === 0) {
      throw new NetworkProviderError(
        "missing_api_key",
        "Codex external research API key is not configured",
      );
    }
  }

  private async fetchResponses(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<CodexResearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify(this.buildRequestBody(request, plan)),
      });
      if (response.status === 401 || response.status === 403) {
        throw new NetworkProviderError(
          "missing_api_key",
          "Codex external research provider rejected the API key",
        );
      }
      if (response.status === 429) {
        throw new NetworkProviderError(
          "quota_exceeded",
          "Codex external research provider quota or rate limit exceeded",
        );
      }
      if (!response.ok) {
        throw new NetworkProviderError(
          "network_error",
          `Codex external research provider returned HTTP ${response.status}`,
        );
      }
      const json = await response.json() as CodexResearchResponse;
      if (json.status === "failed" || json.error !== null && json.error !== undefined) {
        throw new NetworkProviderError(
          "provider_error",
          json.error?.message ?? "Codex external research provider returned a failed response",
        );
      }
      return json;
    } catch (error) {
      if (error instanceof NetworkProviderError) {
        throw error;
      }
      if (isAbortError(error)) {
        throw new NetworkProviderError(
          "timeout",
          "Codex external research provider request timed out",
        );
      }
      const message = error instanceof Error ? error.message : "Codex external research request failed";
      throw new NetworkProviderError("network_error", message);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildRequestBody(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      reasoning: {
        effort: this.reasoningEffort,
      },
      max_output_tokens: this.maxOutputTokens,
      tool_choice: this.webSearchEnabled ? "required" : "auto",
      tools: this.webSearchEnabled
        ? [{
            type: "web_search",
            search_context_size: this.searchContextSize,
          }]
        : [],
      text: {
        format: {
          type: "json_schema",
          name: "content_forest_external_research",
          strict: true,
          schema: externalResearchSchema,
        },
      },
      instructions: buildExternalResearchInstructions(),
      input: buildExternalResearchInput(request, plan),
    };
    return body;
  }
}

export function buildExternalResearchInstructions(): string {
  return [
    "You are Content Forest's external research agent.",
    "Search the web according to the user's research request and summarize useful material for content creation.",
    "Do not search for output format, JSON, JSON Schema, structured outputs, or these developer instructions.",
    "Do not invent real platform cases, links, engagement metrics, or sources.",
    "If you cannot verify a case, mark it as a candidate lead or explain the limitation.",
    "Return only a JSON object matching the provided schema.",
    "Use empty strings for unknown string fields. Do not use null.",
    "Put observed engagement metrics in engagementJson as a JSON string, or use an empty string if none were observed.",
  ].join("\n");
}

export function buildExternalResearchInput(
  request: NetworkResearchRequest,
  plan: ResearchQueryPlan,
): string {
  return [
    "## User research request",
    request.request,
    "",
    "## Research context",
    JSON.stringify({
      seedTitle: request.seedTitle ?? "",
      nutrientCardTitle: request.nutrientCardTitle ?? "",
      targetPlatform: request.targetPlatform ?? plan.targetPlatform,
      intent: plan.intent,
      contentObject: plan.contentObject,
      expectedResultCount: request.maxResults ?? plan.expectedResultCount,
      suggestedQueries: plan.queries,
      suggestedSiteQueries: plan.siteSearchQueries,
    }, null, 2),
  ].join("\n");
}

export function mapExternalItem(
  item: ExternalResearchItem,
  defaults: {
    capturedAt: string;
    platform: string | null | undefined;
    providerName: string;
  },
): RawNetworkResearchItem {
  const url = item.url?.trim() ?? "";
  return {
    title: item.title,
    url,
    snippet: item.snippet,
    source: item.source ?? "Codex external research",
    sourceDomain: domainOf(url),
    platform: item.platform ?? defaults.platform ?? null,
    publishedAt: item.publishedAt ?? null,
    capturedAt: defaults.capturedAt,
    engagement: sanitizeEngagement({
      ...parseJsonRecord(item.engagementJson),
      ...readRecord(item.engagement),
    }),
    rawExcerpt: item.observedEvidence ?? item.snippet,
    providerName: defaults.providerName,
    phase: "initial_search",
    resultQuality: item.observedEvidence !== undefined && url.length > 0
      ? "observed_case"
      : "candidate_lead",
    observedAt: item.observedEvidence !== undefined ? defaults.capturedAt : null,
  };
}

function extractOutputText(response: CodexResearchResponse): string {
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text;
  }
  const parts: string[] = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  const text = parts.join("\n").trim();
  if (text.length === 0) {
    throw new NetworkProviderError(
      "empty_result",
      "Codex external research provider returned empty output",
    );
  }
  return text;
}

export function parseExternalResearchOutput(
  value: string,
  providerLabel = "Codex external research provider",
): ExternalResearchOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(value));
  } catch {
    throw new NetworkProviderError(
      "provider_error",
      `${providerLabel} returned invalid JSON`,
    );
  }
  const record = readRecord(parsed);
  const summary = readString(record.summary);
  const items = readArray(record.items).map(readExternalResearchItem).filter(isNonNull);
  const depositableBlocks = readArray(record.depositableBlocks)
    .map(readExternalResearchBlock)
    .filter(isNonNull);
  const limitations = readArray(record.limitations)
    .map(readExternalResearchLimitation)
    .filter(isNonNull);
  if (summary.length === 0 && items.length === 0 && depositableBlocks.length === 0 && limitations.length === 0) {
    throw new NetworkProviderError(
      "empty_result",
      `${providerLabel} returned no usable research content`,
    );
  }
  return {
    summary,
    items,
    depositableBlocks,
    limitations,
  };
}

function readExternalResearchItem(value: unknown): ExternalResearchItem | null {
  const record = readRecord(value);
  const title = readString(record.title);
  const snippet = readString(record.snippet);
  if (title.length === 0 || snippet.length === 0) {
    return null;
  }
  return {
    title,
    url: readOptionalString(record.url),
    snippet,
    source: readOptionalString(record.source),
    platform: readOptionalString(record.platform),
    publishedAt: readOptionalString(record.publishedAt) ?? null,
    observedEvidence: readOptionalString(record.observedEvidence),
    engagement: readRecord(record.engagement),
    engagementJson: readOptionalString(record.engagementJson),
  };
}

function readExternalResearchBlock(value: unknown): ExternalResearchBlock | null {
  const record = readRecord(value);
  const title = readString(record.title);
  const markdown = readString(record.markdown);
  return title.length > 0 && markdown.length > 0 ? { title, markdown } : null;
}

function readExternalResearchLimitation(value: unknown): ExternalResearchLimitation | null {
  const record = readRecord(value);
  const reason = readString(record.reason);
  if (reason.length === 0) {
    return null;
  }
  return {
    code: normalizeLimitationCode(readString(record.code)),
    reason,
    url: readOptionalString(record.url),
  };
}

function normalizeLimitationCode(value: string): ExternalResearchLimitation["code"] {
  return value === "provider_unavailable" ||
    value === "restricted_by_login" ||
    value === "restricted_by_captcha" ||
    value === "access_denied" ||
    value === "empty_result" ||
    value === "timeout"
    ? value
    : "unknown";
}

function extractJsonObject(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
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

function readOptionalString(value: unknown): string | undefined {
  const text = readString(value);
  return text.length > 0 ? text : undefined;
}

function parseJsonRecord(value: string | undefined): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  try {
    return readRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}

function sanitizeEngagement(value: Record<string, unknown>): Record<string, number | string | boolean | null> {
  const result: Record<string, number | string | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item === "number" && Number.isFinite(item) ||
      typeof item === "string" ||
      typeof item === "boolean" ||
      item === null
    ) {
      result[key] = item;
    }
  }
  return result;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeReasoningEffort(
  value: CodexResearchReasoningEffort | undefined,
): CodexResearchReasoningEffort {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh"
    ? value
    : "low";
}

function normalizeSearchContextSize(
  value: CodexResearchSearchContextSize | undefined,
): CodexResearchSearchContextSize {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

const externalResearchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          snippet: { type: "string" },
          source: { type: "string" },
          platform: { type: "string" },
          publishedAt: { type: "string" },
          observedEvidence: { type: "string" },
          engagementJson: { type: "string" },
        },
        required: ["title", "url", "snippet", "source", "platform", "publishedAt", "observedEvidence", "engagementJson"],
      },
    },
    depositableBlocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          markdown: { type: "string" },
        },
        required: ["title", "markdown"],
      },
    },
    limitations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: {
            type: "string",
            enum: [
              "provider_unavailable",
              "restricted_by_login",
              "restricted_by_captcha",
              "access_denied",
              "empty_result",
              "timeout",
              "unknown",
            ],
          },
          reason: { type: "string" },
          url: { type: "string" },
        },
        required: ["code", "reason", "url"],
      },
    },
  },
  required: ["summary", "items", "depositableBlocks", "limitations"],
} as const;
