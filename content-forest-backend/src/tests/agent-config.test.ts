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
    expect(sample).not.toContain("sk-cp-");
  });
});
