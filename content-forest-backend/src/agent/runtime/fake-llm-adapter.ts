import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "./llm-adapter.js";

export class FakeLlmAdapter implements LlmAdapter {
  private readonly content: string;

  public constructor(content: string = "fake llm response") {
    this.content = content;
  }

  public async complete(_input: LlmCompletionInput): Promise<LlmCompletionResult> {
    return {
      content: this.content,
    };
  }
}
