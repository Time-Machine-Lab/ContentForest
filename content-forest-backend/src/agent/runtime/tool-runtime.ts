import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext } from "./agent-task.js";
import type { AgentTrace } from "./agent-trace.js";
import type { ToolInput, ToolOutput } from "./tool-contract.js";
import type { ToolRegistry } from "./tool-registry.js";

export class ToolRuntime {
  private readonly registry: ToolRegistry;
  private readonly context: AgentTaskContext;
  private readonly trace: AgentTrace;

  public constructor(
    registry: ToolRegistry,
    context: AgentTaskContext,
    trace: AgentTrace,
  ) {
    this.registry = registry;
    this.context = context;
    this.trace = trace;
  }

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    const tool = this.registry.find(name);
    this.trace.record("tool_called", `Tool called: ${name}`, { toolName: name });

    try {
      return await tool.execute(input, this.context);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed";
      this.trace.record("tool_failed", `Tool failed: ${name}`, {
        toolName: name,
        reason: message,
      });

      if (isApplicationError(error)) {
        throw error;
      }

      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        `Agent tool failed: ${name}`,
        500,
      );
    }
  }
}
