import { ApplicationError } from "../../shared/errors/application-error.js";
import {
  BrowserResearchProvider,
  CodexExternalResearchProvider,
  NetworkProviderRouter,
  OpenClawExternalResearchProvider,
  PlatformDataPlaceholderProvider,
  PublicWebSearchProvider,
  WebPageFetchPlaceholderProvider,
  type NetworkDataRequest,
  type NetworkProviderEntry,
} from "../networked-research/index.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";
import type {
  ToolContract,
  ToolExecutionOptions,
  ToolInput,
  ToolOutput,
} from "../runtime/tool-contract.js";

export const NETWORKED_RESEARCH_TOOL_NAME = "networked_research";

export class NetworkedResearchTool implements ToolContract {
  public readonly name = NETWORKED_RESEARCH_TOOL_NAME;
  public readonly description =
    "Run controlled network data research or URL observation through provider router.";
  public readonly readOnly = true;

  private readonly router: NetworkProviderRouter;

  public constructor(
    router?: NetworkProviderRouter,
    env?: NetworkedResearchToolEnv,
  ) {
    this.router = router ?? createDefaultNetworkProviderRouter(undefined, env);
  }

  public async execute(
    input: ToolInput,
    context: AgentTaskContext,
    options: ToolExecutionOptions = {},
  ): Promise<ToolOutput> {
    if (context.taskType !== "nutrient_research") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "联网数据获取工具仅允许受控 Agent 任务使用",
        400,
      );
    }
    const request = parseNetworkDataRequest(input);
    assertNotAborted(options.signal);
    try {
      const result = await this.router.run(request);
      assertNotAborted(options.signal);
      return {
        content: result,
        metadata: summarizeNetworkResult(result),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "联网数据获取失败，请稍后重试";
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `联网数据获取失败：${message}`,
        502,
      );
    }
  }
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted !== true) {
    return;
  }
  throw new ApplicationError("AGENT_TASK_CANCELLED", "Agent task cancelled", 499);
}

export function createDefaultNetworkProviderRouter(
  providers?: NetworkProviderEntry[],
  env: NetworkedResearchToolEnv = process.env,
): NetworkProviderRouter {
  return new NetworkProviderRouter({
    providers: providers ?? [
      ...createExternalAgentProviders(env),
      ...createExplicitLegacyProviders(env),
    ],
  });
}

export interface NetworkedResearchToolEnv {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  wireApi?: "responses";
  model?: string;
  reasoningEffort?: "low" | "medium" | "high" | "xhigh";
  authMethod?: "api";
  webSearchEnabled?: boolean;
  searchContextSize?: "low" | "medium" | "high";
  timeoutMs?: number;
  maxOutputTokens?: number;
  provider?: string;
  fallbackProvider?: string;
  codex?: {
    enabled?: boolean;
    baseUrl?: string;
    apiKey?: string;
    wireApi?: "responses";
    model?: string;
    reasoningEffort?: "low" | "medium" | "high" | "xhigh";
    authMethod?: "api";
    webSearchEnabled?: boolean;
    searchContextSize?: "low" | "medium" | "high";
    timeoutMs?: number;
    maxOutputTokens?: number;
  };
  openClaw?: {
    enabled?: boolean;
    gatewayUrl?: string;
    authToken?: string;
    timeoutMs?: number;
    sessionPrefix?: string;
    deleteSessionOnFinish?: boolean;
  };
  CONTENT_FOREST_RESEARCH_PROVIDER?: string;
  CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER?: string;
  CONTENT_FOREST_CODEX_RESEARCH_BASE_URL?: string;
  CONTENT_FOREST_CODEX_RESEARCH_API_KEY?: string;
  CONTENT_FOREST_CODEX_RESEARCH_WIRE_API?: string;
  CONTENT_FOREST_CODEX_RESEARCH_MODEL?: string;
  CONTENT_FOREST_CODEX_RESEARCH_REASONING_EFFORT?: string;
  CONTENT_FOREST_CODEX_RESEARCH_AUTH_METHOD?: string;
  CONTENT_FOREST_CODEX_RESEARCH_WEB_SEARCH_ENABLED?: string;
  CONTENT_FOREST_CODEX_RESEARCH_SEARCH_CONTEXT_SIZE?: string;
  CONTENT_FOREST_CODEX_RESEARCH_TIMEOUT_MS?: string;
  CONTENT_FOREST_CODEX_RESEARCH_MAX_OUTPUT_TOKENS?: string;
  CONTENT_FOREST_OPENCLAW_GATEWAY_URL?: string;
  CONTENT_FOREST_OPENCLAW_AUTH_TOKEN?: string;
  CONTENT_FOREST_OPENCLAW_TIMEOUT_MS?: string;
  CONTENT_FOREST_OPENCLAW_SESSION_PREFIX?: string;
  CONTENT_FOREST_OPENCLAW_DELETE_SESSION_ON_FINISH?: string;
  CONTENT_FOREST_ENABLE_LEGACY_NETWORK_PROVIDERS?: string;
  CONTENT_FOREST_SEARCH_PROVIDER?: string;
  CONTENT_FOREST_SEARCH_API_KEY?: string;
  CONTENT_FOREST_SEARCH_ENDPOINT?: string;
}

function parseNetworkDataRequest(input: ToolInput): NetworkDataRequest {
  const mode = readOptionalString(input.mode) === "observe" ? "observe" : "research";
  if (mode === "observe") {
    return {
      mode,
      url: readRequiredString(input.url, "观测链接不能为空").slice(0, 1200),
      platform: readOptionalString(input.platform) || undefined,
    };
  }
  return {
    mode,
    request: readRequiredString(input.request ?? input.query, "研究请求不能为空"),
    seedTitle: readOptionalString(input.seedTitle) || undefined,
    nutrientCardTitle: readOptionalString(input.nutrientCardTitle) || undefined,
    targetPlatform: readOptionalString(input.targetPlatform) || undefined,
    maxResults: normalizeMaxResults(input.maxResults),
  };
}

function summarizeNetworkResult(result: Awaited<ReturnType<NetworkProviderRouter["run"]>>) {
  if (result.mode === "observe") {
    return {
      mode: result.mode,
      providerFailures: result.failures.length,
      hasObservation: result.observation !== null,
      accessStatus: result.observation?.accessStatus ?? null,
    };
  }
  return {
    mode: result.mode,
    queryCount: result.queryPlan.queries.length,
    siteSearchQueryCount: result.queryPlan.siteSearchQueries.length,
    resultCount: result.results.length,
    providerFailures: result.failures.length,
    restrictedStatuses: result.restrictedStatuses.length,
    queries: result.queryPlan.queries,
    siteSearchQueries: result.queryPlan.siteSearchQueries,
    resultQualitySummary: summarizeResultQuality(result.results),
    trace: result.trace,
  };
}

function summarizeResultQuality(
  results: Array<{ resultQuality?: string }>,
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const result of results) {
    const quality = result.resultQuality ?? "unknown";
    summary[quality] = (summary[quality] ?? 0) + 1;
  }
  return summary;
}

function normalizeMaxResults(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 12) {
    throw new ApplicationError("VALIDATION_ERROR", "研究结果数量必须在 1 到 12 之间", 400);
  }
  return value as number;
}

function readRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 400);
  }
  return value.trim();
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toCodexExternalResearchOptions(env: NetworkedResearchToolEnv) {
  const codex = env.codex;
  return {
    enabled: readOptionalBoolean(
      codex?.enabled ?? env.enabled,
      isCodexExternalResearchSelected(env),
    ),
    baseUrl: readOptionalString(
      codex?.baseUrl ?? env.baseUrl ?? env.CONTENT_FOREST_CODEX_RESEARCH_BASE_URL,
    ),
    apiKey: readOptionalString(
      codex?.apiKey ?? env.apiKey ?? env.CONTENT_FOREST_CODEX_RESEARCH_API_KEY,
    ),
    wireApi:
      codex?.wireApi ??
      env.wireApi ??
      readWireApi(env.CONTENT_FOREST_CODEX_RESEARCH_WIRE_API),
    model:
      readOptionalString(codex?.model ?? env.model ?? env.CONTENT_FOREST_CODEX_RESEARCH_MODEL) ||
      "gpt-5.5",
    reasoningEffort:
      codex?.reasoningEffort ??
      env.reasoningEffort ??
      readReasoningEffort(env.CONTENT_FOREST_CODEX_RESEARCH_REASONING_EFFORT),
    authMethod: codex?.authMethod ?? env.authMethod ?? "api" as const,
    webSearchEnabled: readOptionalBoolean(
      codex?.webSearchEnabled ?? env.webSearchEnabled,
      readOptionalBoolean(env.CONTENT_FOREST_CODEX_RESEARCH_WEB_SEARCH_ENABLED, true),
    ),
    searchContextSize:
      codex?.searchContextSize ??
      env.searchContextSize ??
      readSearchContextSize(env.CONTENT_FOREST_CODEX_RESEARCH_SEARCH_CONTEXT_SIZE),
    timeoutMs:
      codex?.timeoutMs ??
      env.timeoutMs ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_CODEX_RESEARCH_TIMEOUT_MS, 180000),
    maxOutputTokens:
      codex?.maxOutputTokens ??
      env.maxOutputTokens ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_CODEX_RESEARCH_MAX_OUTPUT_TOKENS, 6000),
  };
}

function createExternalAgentProviders(env: NetworkedResearchToolEnv): NetworkProviderEntry[] {
  const selected = selectedResearchProviders(env);
  const providers: NetworkProviderEntry[] = [];
  for (const provider of selected) {
    if (provider === "openclaw-external-agent") {
      providers.push(new OpenClawExternalResearchProvider(toOpenClawExternalResearchOptions(env)));
      continue;
    }
    if (provider === "codex-external-agent" || provider === "external-agent" || provider === "") {
      providers.push(new CodexExternalResearchProvider(toCodexExternalResearchOptions(env)));
    }
  }
  return providers.length > 0
    ? providers
    : [new CodexExternalResearchProvider(toCodexExternalResearchOptions(env))];
}

function toOpenClawExternalResearchOptions(env: NetworkedResearchToolEnv) {
  const openClaw = env.openClaw;
  return {
    enabled: readOptionalBoolean(
      openClaw?.enabled,
      selectedResearchProviders(env).includes("openclaw-external-agent"),
    ),
    gatewayUrl: readOptionalString(
      openClaw?.gatewayUrl ?? env.CONTENT_FOREST_OPENCLAW_GATEWAY_URL,
    ),
    authToken: readOptionalString(
      openClaw?.authToken ?? env.CONTENT_FOREST_OPENCLAW_AUTH_TOKEN,
    ),
    timeoutMs:
      openClaw?.timeoutMs ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_OPENCLAW_TIMEOUT_MS, 180000),
    sessionPrefix:
      readOptionalString(
        openClaw?.sessionPrefix ?? env.CONTENT_FOREST_OPENCLAW_SESSION_PREFIX,
      ) || "content-forest",
    deleteSessionOnFinish: readOptionalBoolean(
      openClaw?.deleteSessionOnFinish,
      readOptionalBoolean(env.CONTENT_FOREST_OPENCLAW_DELETE_SESSION_ON_FINISH, true),
    ),
  };
}

function createExplicitLegacyProviders(env: NetworkedResearchToolEnv): NetworkProviderEntry[] {
  if (!readOptionalBoolean(env.CONTENT_FOREST_ENABLE_LEGACY_NETWORK_PROVIDERS, false)) {
    return [];
  }
  return [
    new PublicWebSearchProvider(),
    new BrowserResearchProvider({
      allowedDomains: [
        "xiaohongshu.com",
        "*.xiaohongshu.com",
        "www.xiaohongshu.com",
        "douyin.com",
        "*.douyin.com",
        "tiktok.com",
        "*.tiktok.com",
        "instagram.com",
        "*.instagram.com",
        "youtube.com",
        "*.youtube.com",
        "x.com",
        "*.x.com",
        "twitter.com",
        "*.twitter.com",
      ],
    }),
    new WebPageFetchPlaceholderProvider(),
    new PlatformDataPlaceholderProvider(),
  ];
}

function isCodexExternalResearchSelected(env: NetworkedResearchToolEnv): boolean {
  return selectedResearchProviders(env).some((provider) =>
    provider === "" || provider === "codex-external-agent" || provider === "external-agent"
  );
}

function selectedResearchProviders(env: NetworkedResearchToolEnv): string[] {
  const primary =
    readOptionalString(env.provider ?? env.CONTENT_FOREST_RESEARCH_PROVIDER).toLowerCase();
  const fallback =
    readOptionalString(
      env.fallbackProvider ?? env.CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER,
    ).toLowerCase();
  const configured = [primary || "codex-external-agent", fallback].filter(
    (provider, index, providers) =>
      provider.length > 0 && providers.indexOf(provider) === index,
  );
  if (hasOpenClawConfig(env) && !configured.includes("openclaw-external-agent")) {
    configured.unshift("openclaw-external-agent");
  }
  return configured.sort((left, right) =>
    providerPriority(left) - providerPriority(right)
  );
}

function providerPriority(provider: string): number {
  if (provider === "openclaw-external-agent") {
    return 0;
  }
  if (provider === "codex-external-agent" || provider === "external-agent" || provider === "") {
    return 1;
  }
  return 2;
}

function hasOpenClawConfig(env: NetworkedResearchToolEnv): boolean {
  const gatewayUrl = readOptionalString(
    env.openClaw?.gatewayUrl ?? env.CONTENT_FOREST_OPENCLAW_GATEWAY_URL,
  );
  const authToken = readOptionalString(
    env.openClaw?.authToken ?? env.CONTENT_FOREST_OPENCLAW_AUTH_TOKEN,
  );
  return gatewayUrl.length > 0 && authToken.length > 0;
}

function readOptionalBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function readWireApi(value: string | undefined): "responses" {
  return value?.trim().toLowerCase() === "responses" ? "responses" : "responses";
}

function readReasoningEffort(value: string | undefined): "low" | "medium" | "high" | "xhigh" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "low" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "xhigh"
    ? normalized
    : "low";
}

function readSearchContextSize(value: string | undefined): "low" | "medium" | "high" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high"
    ? normalized
    : "medium";
}

function readOptionalPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
