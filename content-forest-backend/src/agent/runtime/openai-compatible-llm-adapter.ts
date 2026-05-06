import { ApplicationError } from "../../shared/errors/application-error.js";
import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "./llm-adapter.js";

export interface OpenAiCompatibleLlmAdapterConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  fetcher?: typeof fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAiCompatibleLlmAdapter implements LlmAdapter {
  private readonly provider: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  public constructor(config: OpenAiCompatibleLlmAdapterConfig) {
    this.provider = requireNonBlank(config.provider, "LLM provider is required");
    this.baseUrl = requireNonBlank(config.baseUrl, "LLM base URL is required")
      .replace(/\/+$/, "");
    this.model = requireNonBlank(config.model, "LLM model is required");
    this.apiKey = requireNonBlank(config.apiKey, "LLM API key is required");
    this.fetcher = config.fetcher ?? fetch;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    try {
      const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model ?? this.model,
          messages: input.messages,
          temperature: input.temperature,
        }),
      });

      if (!response.ok) {
        throw new ApplicationError(
          "AGENT_LLM_ERROR",
          `LLM provider ${this.provider} request failed with status ${response.status}`,
          502,
        );
      }

      const raw = await response.json() as ChatCompletionResponse;
      const content = raw.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new ApplicationError(
          "AGENT_LLM_ERROR",
          `LLM provider ${this.provider} returned empty content`,
          502,
        );
      }

      return {
        content,
        raw,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        "AGENT_LLM_ERROR",
        `LLM provider ${this.provider} request failed`,
        502,
      );
    }
  }
}

function requireNonBlank(value: string, message: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ApplicationError("CONFIGURATION_ERROR", message, 500);
  }
  return normalized;
}
