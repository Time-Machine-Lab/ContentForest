import type { AgentTaskContext } from "./agent-task.js";

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolOutput {
  content: unknown;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionOptions {
  signal?: AbortSignal;
}

export interface ToolContract {
  name: string;
  description: string;
  readOnly: true;
  execute(
    input: ToolInput,
    context: AgentTaskContext,
    options?: ToolExecutionOptions,
  ): Promise<ToolOutput>;
}

export interface ToolCaller {
  callTool(name: string, input: ToolInput): Promise<ToolOutput>;
}
