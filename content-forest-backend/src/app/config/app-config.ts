import { resolve } from "node:path";

export interface AppConfig {
  contentRootDir: string;
  databasePath: string;
  port: number;
  agent: AgentConfig;
}

export type AgentLlmMode = "fake" | "openai-compatible";

export interface AgentLlmConfig {
  mode: AgentLlmMode;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  isRealLlmAvailable: boolean;
  warnings: string[];
}

export interface AgentConfig {
  llm: AgentLlmConfig;
  exchangeLog: AgentExchangeLogConfig;
  externalResearch: ExternalResearchConfig;
}

export type CodexExternalResearchWireApi = "responses";
export type CodexExternalResearchReasoningEffort = "low" | "medium" | "high" | "xhigh";
export type CodexExternalResearchAuthMethod = "api";
export type CodexExternalResearchSearchContextSize = "low" | "medium" | "high";

export interface CodexExternalResearchConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  wireApi: CodexExternalResearchWireApi;
  model: string;
  reasoningEffort: CodexExternalResearchReasoningEffort;
  authMethod: CodexExternalResearchAuthMethod;
  webSearchEnabled: boolean;
  searchContextSize: CodexExternalResearchSearchContextSize;
  timeoutMs: number;
  maxOutputTokens: number;
  isAvailable: boolean;
  warnings: string[];
}

export interface OpenClawExternalResearchConfig {
  enabled: boolean;
  gatewayUrl: string;
  authToken: string;
  timeoutMs: number;
  sessionPrefix: string;
  deleteSessionOnFinish: boolean;
  isAvailable: boolean;
  warnings: string[];
}

export interface ExternalResearchConfig extends CodexExternalResearchConfig {
  provider: string;
  fallbackProvider: string;
  codex: CodexExternalResearchConfig;
  openClaw: OpenClawExternalResearchConfig;
}

export interface AgentExchangeLogConfig {
  enabled: boolean;
  dir: string;
  maxContentChars: number;
}

export interface AppConfigEnv {
  CONTENT_FOREST_CONTENT_ROOT?: string;
  CONTENT_FOREST_DATABASE_PATH?: string;
  CONTENT_FOREST_PORT?: string;
  CONTENT_FOREST_AGENT_LLM_MODE?: string;
  CONTENT_FOREST_AGENT_LLM_PROVIDER?: string;
  CONTENT_FOREST_AGENT_LLM_BASE_URL?: string;
  CONTENT_FOREST_AGENT_LLM_MODEL?: string;
  CONTENT_FOREST_AGENT_LLM_API_KEY?: string;
  CONTENT_FOREST_AGENT_EXCHANGE_LOG_ENABLED?: string;
  CONTENT_FOREST_AGENT_EXCHANGE_LOG_DIR?: string;
  CONTENT_FOREST_AGENT_EXCHANGE_LOG_MAX_CONTENT_CHARS?: string;
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
}

export function loadAppConfig(
  env: AppConfigEnv = process.env,
  cwd: string = process.cwd(),
): AppConfig {
  return {
    contentRootDir: resolve(
      cwd,
      env.CONTENT_FOREST_CONTENT_ROOT ?? "data/content",
    ),
    databasePath: resolve(
      cwd,
      env.CONTENT_FOREST_DATABASE_PATH ?? "data/app.sqlite",
    ),
    port: Number.parseInt(env.CONTENT_FOREST_PORT ?? "3001", 10),
    agent: {
      llm: loadAgentLlmConfig(env),
      exchangeLog: loadAgentExchangeLogConfig(env, cwd),
      externalResearch: loadExternalResearchConfig(env),
    },
  };
}

export function loadAgentLlmConfig(env: AppConfigEnv): AgentLlmConfig {
  const mode = normalizeLlmMode(env.CONTENT_FOREST_AGENT_LLM_MODE);
  const provider = env.CONTENT_FOREST_AGENT_LLM_PROVIDER?.trim() ?? "";
  const baseUrl = env.CONTENT_FOREST_AGENT_LLM_BASE_URL?.trim() ?? "";
  const model = env.CONTENT_FOREST_AGENT_LLM_MODEL?.trim() ?? "";
  const apiKey = env.CONTENT_FOREST_AGENT_LLM_API_KEY?.trim() ?? "";
  const missingFields =
    mode === "openai-compatible"
      ? getMissingRealLlmFields({ provider, baseUrl, model, apiKey })
      : [];

  return {
    mode,
    provider,
    baseUrl,
    model,
    apiKey,
    isRealLlmAvailable: mode === "openai-compatible" && missingFields.length === 0,
    warnings: missingFields.map(
      (field) =>
        `Agent real LLM config is missing ${field}. Set CONTENT_FOREST_AGENT_LLM_${field}.`,
    ),
  };
}

export function getAgentLlmStartupWarnings(config: AppConfig): string[] {
  return [...config.agent.llm.warnings, ...config.agent.externalResearch.warnings];
}

export function loadExternalResearchConfig(
  env: AppConfigEnv,
): ExternalResearchConfig {
  const provider = normalizeResearchProvider(env.CONTENT_FOREST_RESEARCH_PROVIDER);
  const fallbackProvider = normalizeResearchProvider(
    env.CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER,
  );
  const codex = loadCodexExternalResearchConfig(env, provider, fallbackProvider);
  const openClaw = loadOpenClawExternalResearchConfig(
    env,
    provider,
    fallbackProvider,
  );
  return {
    ...codex,
    provider,
    fallbackProvider,
    codex,
    openClaw,
    warnings: [...codex.warnings, ...openClaw.warnings],
  };
}

export function loadCodexExternalResearchConfig(
  env: AppConfigEnv,
  selectedProvider: string = normalizeResearchProvider(env.CONTENT_FOREST_RESEARCH_PROVIDER),
  fallbackProvider: string = normalizeResearchProvider(
    env.CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER,
  ),
): CodexExternalResearchConfig {
  const baseUrl = env.CONTENT_FOREST_CODEX_RESEARCH_BASE_URL?.trim() ?? "";
  const apiKey = env.CONTENT_FOREST_CODEX_RESEARCH_API_KEY?.trim() ?? "";
  const wireApi = normalizeWireApi(env.CONTENT_FOREST_CODEX_RESEARCH_WIRE_API);
  const model = env.CONTENT_FOREST_CODEX_RESEARCH_MODEL?.trim() ?? "gpt-5.5";
  const reasoningEffort = normalizeReasoningEffort(
    env.CONTENT_FOREST_CODEX_RESEARCH_REASONING_EFFORT,
  );
  const authMethod = normalizeAuthMethod(env.CONTENT_FOREST_CODEX_RESEARCH_AUTH_METHOD);
  const webSearchEnabled = normalizeBoolean(
    env.CONTENT_FOREST_CODEX_RESEARCH_WEB_SEARCH_ENABLED ?? "true",
  );
  const searchContextSize = normalizeSearchContextSize(
    env.CONTENT_FOREST_CODEX_RESEARCH_SEARCH_CONTEXT_SIZE,
  );
  const timeoutMs = normalizePositiveInteger(
    env.CONTENT_FOREST_CODEX_RESEARCH_TIMEOUT_MS,
    180000,
  );
  const maxOutputTokens = normalizePositiveInteger(
    env.CONTENT_FOREST_CODEX_RESEARCH_MAX_OUTPUT_TOKENS,
    6000,
  );
  const enabled =
    selectedProvider === "codex-external-agent" ||
    selectedProvider === "external-agent" ||
    selectedProvider === "" ||
    fallbackProvider === "codex-external-agent" ||
    fallbackProvider === "external-agent";
  const missingFields =
    enabled && (selectedProvider !== "" || fallbackProvider !== "")
      ? getMissingCodexResearchFields({ baseUrl, apiKey, model })
      : [];

  return {
    enabled,
    baseUrl,
    apiKey,
    wireApi,
    model,
    reasoningEffort,
    authMethod,
    webSearchEnabled,
    searchContextSize,
    timeoutMs,
    maxOutputTokens,
    isAvailable: enabled && baseUrl.length > 0 && apiKey.length > 0 && model.length > 0,
    warnings: missingFields.map(
      (field) =>
        `Codex external research config is missing ${field}. Set CONTENT_FOREST_CODEX_RESEARCH_${field}.`,
    ),
  };
}

export function loadOpenClawExternalResearchConfig(
  env: AppConfigEnv,
  selectedProvider: string = normalizeResearchProvider(env.CONTENT_FOREST_RESEARCH_PROVIDER),
  fallbackProvider: string = normalizeResearchProvider(
    env.CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER,
  ),
): OpenClawExternalResearchConfig {
  const gatewayUrl = env.CONTENT_FOREST_OPENCLAW_GATEWAY_URL?.trim() ?? "";
  const authToken = env.CONTENT_FOREST_OPENCLAW_AUTH_TOKEN?.trim() ?? "";
  const timeoutMs = normalizePositiveInteger(
    env.CONTENT_FOREST_OPENCLAW_TIMEOUT_MS,
    180000,
  );
  const sessionPrefix =
    env.CONTENT_FOREST_OPENCLAW_SESSION_PREFIX?.trim() || "content-forest";
  const deleteSessionOnFinish = normalizeBooleanWithDefault(
    env.CONTENT_FOREST_OPENCLAW_DELETE_SESSION_ON_FINISH,
    true,
  );
  const enabled =
    selectedProvider === "openclaw-external-agent" ||
    fallbackProvider === "openclaw-external-agent";
  const missingFields = enabled
    ? [
        gatewayUrl.length === 0 ? "GATEWAY_URL" : null,
        authToken.length === 0 ? "AUTH_TOKEN" : null,
      ].filter((field): field is string => field !== null)
    : [];

  return {
    enabled,
    gatewayUrl,
    authToken,
    timeoutMs,
    sessionPrefix,
    deleteSessionOnFinish,
    isAvailable: enabled && gatewayUrl.length > 0 && authToken.length > 0,
    warnings: missingFields.map(
      (field) =>
        `OpenClaw external research config is missing ${field}. Set CONTENT_FOREST_OPENCLAW_${field}.`,
    ),
  };
}

export function loadAgentExchangeLogConfig(
  env: AppConfigEnv,
  cwd: string = process.cwd(),
): AgentExchangeLogConfig {
  return {
    enabled: normalizeBoolean(env.CONTENT_FOREST_AGENT_EXCHANGE_LOG_ENABLED),
    dir: resolve(cwd, env.CONTENT_FOREST_AGENT_EXCHANGE_LOG_DIR ?? "logs"),
    maxContentChars: normalizePositiveInteger(
      env.CONTENT_FOREST_AGENT_EXCHANGE_LOG_MAX_CONTENT_CHARS,
      4000,
    ),
  };
}

function normalizeLlmMode(value: string | undefined): AgentLlmMode {
  return value === "openai-compatible" ? "openai-compatible" : "fake";
}

function normalizeWireApi(value: string | undefined): CodexExternalResearchWireApi {
  return value?.trim().toLowerCase() === "responses" ? "responses" : "responses";
}

function normalizeReasoningEffort(
  value: string | undefined,
): CodexExternalResearchReasoningEffort {
  const normalized = value?.trim().toLowerCase();
  return normalized === "low" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "xhigh"
    ? normalized
    : "low";
}

function normalizeAuthMethod(value: string | undefined): CodexExternalResearchAuthMethod {
  return value?.trim().toLowerCase() === "api" ? "api" : "api";
}

function normalizeSearchContextSize(
  value: string | undefined,
): CodexExternalResearchSearchContextSize {
  const normalized = value?.trim().toLowerCase();
  return normalized === "low" || normalized === "medium" || normalized === "high"
    ? normalized
    : "medium";
}

function normalizeBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function normalizeBooleanWithDefault(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) {
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

function normalizeResearchProvider(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getMissingRealLlmFields(config: {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}): string[] {
  return [
    config.provider.length === 0 ? "PROVIDER" : null,
    config.baseUrl.length === 0 ? "BASE_URL" : null,
    config.model.length === 0 ? "MODEL" : null,
    config.apiKey.length === 0 ? "API_KEY" : null,
  ].filter((field): field is string => field !== null);
}

function getMissingCodexResearchFields(config: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): string[] {
  return [
    config.baseUrl.length === 0 ? "BASE_URL" : null,
    config.apiKey.length === 0 ? "API_KEY" : null,
    config.model.length === 0 ? "MODEL" : null,
  ].filter((field): field is string => field !== null);
}
