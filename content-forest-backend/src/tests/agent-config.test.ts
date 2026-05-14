import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAgentLlmStartupWarnings,
  loadAppConfig,
} from "../app/config/app-config.js";

describe("Agent LLM config", () => {
  it("defaults to fake LLM mode without startup warnings", () => {
    const config = loadAppConfig({}, "D:/project/content-forest-backend");

    expect(config.agent.llm.mode).toBe("fake");
    expect(config.agent.llm.isRealLlmAvailable).toBe(false);
    expect(config.agent.exchangeLog).toMatchObject({
      enabled: false,
      dir: "D:\\project\\content-forest-backend\\logs",
      maxContentChars: 4000,
    });
    expect(getAgentLlmStartupWarnings(config)).toEqual([]);
  });

  it("warns about every missing real LLM config field without leaking keys", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_AGENT_LLM_MODE: "openai-compatible",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.llm.isRealLlmAvailable).toBe(false);
    expect(getAgentLlmStartupWarnings(config).join("\n")).toContain("PROVIDER");
    expect(getAgentLlmStartupWarnings(config).join("\n")).toContain("BASE_URL");
    expect(getAgentLlmStartupWarnings(config).join("\n")).toContain("MODEL");
    expect(getAgentLlmStartupWarnings(config).join("\n")).toContain("API_KEY");
    expect(getAgentLlmStartupWarnings(config).join("\n")).not.toContain("sk-");
  });

  it("marks real LLM as available when provider, base URL, model and API key exist", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_AGENT_LLM_MODE: "openai-compatible",
        CONTENT_FOREST_AGENT_LLM_PROVIDER: "minimax",
        CONTENT_FOREST_AGENT_LLM_BASE_URL: "https://api.minimaxi.com/v1",
        CONTENT_FOREST_AGENT_LLM_MODEL: "example-model",
        CONTENT_FOREST_AGENT_LLM_API_KEY: "test-key",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.llm).toMatchObject({
      mode: "openai-compatible",
      provider: "minimax",
      baseUrl: "https://api.minimaxi.com/v1",
      model: "example-model",
      isRealLlmAvailable: true,
      warnings: [],
    });
  });

  it("loads agent exchange log config from env", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_AGENT_EXCHANGE_LOG_ENABLED: "true",
        CONTENT_FOREST_AGENT_EXCHANGE_LOG_DIR: "runtime/logs",
        CONTENT_FOREST_AGENT_EXCHANGE_LOG_MAX_CONTENT_CHARS: "1200",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.exchangeLog).toMatchObject({
      enabled: true,
      dir: "D:\\project\\content-forest-backend\\runtime\\logs",
      maxContentChars: 1200,
    });
  });

  it("loads codex external research config without leaking keys in warnings", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_RESEARCH_PROVIDER: "codex-external-agent",
        CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "http://codex-provider.example/v1",
        CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "sk-test-secret-value",
        CONTENT_FOREST_CODEX_RESEARCH_MODEL: "gpt-5.5",
        CONTENT_FOREST_CODEX_RESEARCH_REASONING_EFFORT: "high",
        CONTENT_FOREST_CODEX_RESEARCH_SEARCH_CONTEXT_SIZE: "medium",
        CONTENT_FOREST_CODEX_RESEARCH_TIMEOUT_MS: "90000",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.externalResearch).toMatchObject({
      enabled: true,
      baseUrl: "http://codex-provider.example/v1",
      model: "gpt-5.5",
      reasoningEffort: "high",
      searchContextSize: "medium",
      timeoutMs: 90000,
      isAvailable: true,
      warnings: [],
    });
    expect(getAgentLlmStartupWarnings(config).join("\n")).not.toContain("sk-test");
  });

  it("loads OpenClaw external research config and fallback without leaking tokens", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_RESEARCH_PROVIDER: "openclaw-external-agent",
        CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER: "codex-external-agent",
        CONTENT_FOREST_OPENCLAW_GATEWAY_URL: "ws://openclaw.example",
        CONTENT_FOREST_OPENCLAW_AUTH_TOKEN: "sk-openclaw-secret-value",
        CONTENT_FOREST_OPENCLAW_TIMEOUT_MS: "120000",
        CONTENT_FOREST_OPENCLAW_SESSION_PREFIX: "content-forest-test",
        CONTENT_FOREST_OPENCLAW_DELETE_SESSION_ON_FINISH: "true",
        CONTENT_FOREST_CODEX_RESEARCH_BASE_URL: "http://codex-provider.example/v1",
        CONTENT_FOREST_CODEX_RESEARCH_API_KEY: "sk-codex-secret-value",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.externalResearch.provider).toBe("openclaw-external-agent");
    expect(config.agent.externalResearch.fallbackProvider).toBe("codex-external-agent");
    expect(config.agent.externalResearch.openClaw).toMatchObject({
      enabled: true,
      gatewayUrl: "ws://openclaw.example",
      timeoutMs: 120000,
      sessionPrefix: "content-forest-test",
      deleteSessionOnFinish: true,
      isAvailable: true,
      warnings: [],
    });
    expect(config.agent.externalResearch.codex.isAvailable).toBe(true);
    expect(getAgentLlmStartupWarnings(config).join("\n")).not.toContain("sk-openclaw");
  });

  it("warns for missing OpenClaw config without exposing auth token values", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_RESEARCH_PROVIDER: "openclaw-external-agent",
        CONTENT_FOREST_OPENCLAW_AUTH_TOKEN: "sk-openclaw-secret-value",
      },
      "D:/project/content-forest-backend",
    );

    const warnings = getAgentLlmStartupWarnings(config).join("\n");
    expect(warnings).toContain("GATEWAY_URL");
    expect(warnings).not.toContain("sk-openclaw-secret-value");
  });
});

describe("local secret protection", () => {
  it("keeps local env files ignored while allowing the sample env file", async () => {
    const gitignore = await readFile(join(process.cwd(), ".gitignore"), "utf8");

    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("!.env.example");
    expect(gitignore).toContain("logs/");
  });

  it("does not put real API keys in the sample env file", async () => {
    const sample = await readFile(join(process.cwd(), ".env.example"), "utf8");

    expect(sample).toContain("CONTENT_FOREST_AGENT_LLM_PROVIDER=minimax");
    expect(sample).toContain("CONTENT_FOREST_AGENT_LLM_BASE_URL=https://api.minimaxi.com/v1");
    expect(sample).toContain("CONTENT_FOREST_AGENT_LLM_API_KEY=your-api-key-here");
    expect(sample).toContain("CONTENT_FOREST_AGENT_EXCHANGE_LOG_ENABLED=false");
    expect(sample).toContain("CONTENT_FOREST_AGENT_EXCHANGE_LOG_DIR=logs");
    expect(sample).toContain("CONTENT_FOREST_AGENT_EXCHANGE_LOG_MAX_CONTENT_CHARS=4000");
    expect(sample).toContain("CONTENT_FOREST_RESEARCH_PROVIDER=codex-external-agent");
    expect(sample).toContain("CONTENT_FOREST_RESEARCH_FALLBACK_PROVIDER=");
    expect(sample).toContain("CONTENT_FOREST_CODEX_RESEARCH_API_KEY=your-codex-provider-api-key-here");
    expect(sample).toContain("CONTENT_FOREST_OPENCLAW_GATEWAY_URL=ws://localhost:18789/");
    expect(sample).toContain("CONTENT_FOREST_OPENCLAW_AUTH_TOKEN=your-openclaw-token-here");
    expect(sample).not.toContain("sk-cp-");
  });
});
