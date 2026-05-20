import { ApplicationError } from "../../shared/errors/application-error.js";
import {
  CodexExternalResearchProvider,
  NetworkProviderRouter,
  TikhubMcpPlatformProvider,
  XiaohongshuCliResearchProvider,
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
      new XiaohongshuCliResearchProvider(toXiaohongshuCliResearchOptions(env)),
      new TikhubMcpPlatformProvider(toTikhubMcpPlatformOptions(env)),
      ...createExternalAgentProviders(env),
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
  xiaohongshu?: {
    enabled?: boolean;
    cliPath?: string;
    timeoutMs?: number;
    maxResults?: number;
    defaultSort?: string;
    checkLogin?: boolean;
  };
  tikhub?: {
    enabled?: boolean;
    baseUrl?: string;
    apiKey?: string;
    enableAllPlatforms?: boolean;
    enabledPlatforms?: string[];
    excludedPlatforms?: string[];
    timeoutMs?: number;
    maxResults?: number;
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
  CONTENT_FOREST_XIAOHONGSHU_CLI_ENABLED?: string;
  CONTENT_FOREST_XIAOHONGSHU_CLI_PATH?: string;
  CONTENT_FOREST_XIAOHONGSHU_CLI_TIMEOUT_MS?: string;
  CONTENT_FOREST_XIAOHONGSHU_CLI_MAX_RESULTS?: string;
  CONTENT_FOREST_XIAOHONGSHU_CLI_DEFAULT_SORT?: string;
  CONTENT_FOREST_XIAOHONGSHU_CLI_CHECK_LOGIN?: string;
  CONTENT_FOREST_TIKHUB_MCP_ENABLED?: string;
  CONTENT_FOREST_TIKHUB_MCP_BASE_URL?: string;
  CONTENT_FOREST_TIKHUB_MCP_API_KEY?: string;
  CONTENT_FOREST_TIKHUB_MCP_ENABLE_ALL_PLATFORMS?: string;
  CONTENT_FOREST_TIKHUB_MCP_ENABLED_PLATFORMS?: string;
  CONTENT_FOREST_TIKHUB_MCP_EXCLUDED_PLATFORMS?: string;
  CONTENT_FOREST_TIKHUB_MCP_TIMEOUT_MS?: string;
  CONTENT_FOREST_TIKHUB_MCP_MAX_RESULTS?: string;
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
    deepExploration: readOptionalBoolean(input.deepExploration, false),
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
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 15) {
    throw new ApplicationError("VALIDATION_ERROR", "研究结果数量必须在 1 到 15 之间", 400);
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
    if (provider === "codex-external-agent" || provider === "external-agent" || provider === "") {
      providers.push(new CodexExternalResearchProvider(toCodexExternalResearchOptions(env)));
    }
  }
  return providers.length > 0
    ? providers
    : [new CodexExternalResearchProvider(toCodexExternalResearchOptions(env))];
}

function toXiaohongshuCliResearchOptions(env: NetworkedResearchToolEnv) {
  const xiaohongshu = env.xiaohongshu;
  return {
    enabled: readOptionalBoolean(
      xiaohongshu?.enabled ?? env.CONTENT_FOREST_XIAOHONGSHU_CLI_ENABLED,
      true,
    ),
    cliPath:
      readOptionalString(xiaohongshu?.cliPath ?? env.CONTENT_FOREST_XIAOHONGSHU_CLI_PATH) ||
      "xhs",
    timeoutMs:
      xiaohongshu?.timeoutMs ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_XIAOHONGSHU_CLI_TIMEOUT_MS, 60000),
    maxResults:
      xiaohongshu?.maxResults ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_XIAOHONGSHU_CLI_MAX_RESULTS, 8),
    defaultSort:
      readOptionalString(
        xiaohongshu?.defaultSort ?? env.CONTENT_FOREST_XIAOHONGSHU_CLI_DEFAULT_SORT,
      ) || "general",
    checkLogin: readOptionalBoolean(
      xiaohongshu?.checkLogin ?? env.CONTENT_FOREST_XIAOHONGSHU_CLI_CHECK_LOGIN,
      true,
    ),
  };
}

function toTikhubMcpPlatformOptions(env: NetworkedResearchToolEnv) {
  const tikhub = env.tikhub;
  return {
    enabled: readOptionalBoolean(
      tikhub?.enabled ?? env.CONTENT_FOREST_TIKHUB_MCP_ENABLED,
      true,
    ),
    baseUrl:
      readOptionalString(tikhub?.baseUrl ?? env.CONTENT_FOREST_TIKHUB_MCP_BASE_URL) ||
      "https://mcp.tikhub.io",
    apiKey: readOptionalString(
      tikhub?.apiKey ?? env.CONTENT_FOREST_TIKHUB_MCP_API_KEY,
    ),
    enableAllPlatforms: readOptionalBoolean(
      tikhub?.enableAllPlatforms ?? env.CONTENT_FOREST_TIKHUB_MCP_ENABLE_ALL_PLATFORMS,
      true,
    ),
    enabledPlatforms:
      tikhub?.enabledPlatforms ??
      readCsv(env.CONTENT_FOREST_TIKHUB_MCP_ENABLED_PLATFORMS),
    excludedPlatforms:
      tikhub?.excludedPlatforms ??
      readCsv(env.CONTENT_FOREST_TIKHUB_MCP_EXCLUDED_PLATFORMS || "xiaohongshu,xhs,rednote"),
    timeoutMs:
      tikhub?.timeoutMs ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_TIKHUB_MCP_TIMEOUT_MS, 60000),
    maxResults:
      tikhub?.maxResults ??
      readOptionalPositiveInteger(env.CONTENT_FOREST_TIKHUB_MCP_MAX_RESULTS, 8),
  };
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
  return configured;
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

function readCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}
