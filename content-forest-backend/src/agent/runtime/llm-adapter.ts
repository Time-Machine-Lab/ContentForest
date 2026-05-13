export type LlmMessageRole = "system" | "user" | "assistant" | "tool";

export interface LlmMessage {
  role: LlmMessageRole;
  content: string;
}

export interface LlmCompletionInput {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
}

export interface LlmCompletionResult {
  content: string;
  raw?: unknown;
}

export interface LlmCompletionStreamChunk {
  contentDelta?: string;
  thinkingDelta?: string;
  raw?: unknown;
}

export interface LlmAdapter {
  complete(input: LlmCompletionInput): Promise<LlmCompletionResult>;
  streamComplete?(input: LlmCompletionInput): AsyncIterable<LlmCompletionStreamChunk>;
}
