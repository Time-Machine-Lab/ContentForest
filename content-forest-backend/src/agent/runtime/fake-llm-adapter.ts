import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
  LlmCompletionStreamChunk,
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

  public async *streamComplete(_input: LlmCompletionInput): AsyncIterable<LlmCompletionStreamChunk> {
    const size = 8;
    for (let index = 0; index < this.content.length; index += size) {
      yield {
        contentDelta: this.content.slice(index, index + size),
      };
    }
  }
}
