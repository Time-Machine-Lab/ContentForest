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

  it("loads Xiaohongshu CLI research config", () => {
    const config = loadAppConfig(
      {
        CONTENT_FOREST_XIAOHONGSHU_CLI_ENABLED: "true",
        CONTENT_FOREST_XIAOHONGSHU_CLI_PATH: "D:/tools/xhs.exe",
        CONTENT_FOREST_XIAOHONGSHU_CLI_TIMEOUT_MS: "45000",
        CONTENT_FOREST_XIAOHONGSHU_CLI_MAX_RESULTS: "5",
        CONTENT_FOREST_XIAOHONGSHU_CLI_DEFAULT_SORT: "popular",
        CONTENT_FOREST_XIAOHONGSHU_CLI_CHECK_LOGIN: "false",
      },
      "D:/project/content-forest-backend",
    );

    expect(config.agent.externalResearch.xiaohongshu).toMatchObject({
      enabled: true,
      cliPath: "D:/tools/xhs.exe",
      timeoutMs: 45000,
      maxResults: 5,
      defaultSort: "popular",
      checkLogin: false,
      warnings: [],
    });
  });

  it("defaults Xiaohongshu CLI provider to xhs command", () => {
    const config = loadAppConfig(
      {},
      "D:/project/content-forest-backend",
    );

    expect(config.agent.externalResearch.xiaohongshu).toMatchObject({
      enabled: true,
      cliPath: "xhs",
      timeoutMs: 60000,
      maxResults: 8,
      defaultSort: "general",
      checkLogin: true,
      warnings: [],
    });
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
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_ENABLED=true");
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_PATH=xhs");
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_TIMEOUT_MS=60000");
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_MAX_RESULTS=8");
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_DEFAULT_SORT=general");
    expect(sample).toContain("CONTENT_FOREST_XIAOHONGSHU_CLI_CHECK_LOGIN=true");
    expect(sample).not.toContain("OPENCLAW");
    expect(sample).not.toContain("sk-cp-");
  });
});
