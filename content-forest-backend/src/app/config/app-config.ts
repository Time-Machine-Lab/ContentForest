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
  return [...config.agent.llm.warnings];
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

function normalizeBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
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
