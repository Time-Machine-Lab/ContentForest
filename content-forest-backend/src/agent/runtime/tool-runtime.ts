import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext } from "./agent-task.js";
import type { AgentExchangeLogRecorder } from "./agent-exchange-log.js";
import type { AgentTrace } from "./agent-trace.js";
import type { ToolInput, ToolOutput } from "./tool-contract.js";
import type { ToolRegistry } from "./tool-registry.js";

export class ToolRuntime {
  private readonly registry: ToolRegistry;
  private readonly context: AgentTaskContext;
  private readonly trace: AgentTrace;
  private readonly exchangeLog?: AgentExchangeLogRecorder;

  public constructor(
    registry: ToolRegistry,
    context: AgentTaskContext,
    trace: AgentTrace,
    exchangeLog?: AgentExchangeLogRecorder,
  ) {
    this.registry = registry;
    this.context = context;
    this.trace = trace;
    this.exchangeLog = exchangeLog;
  }

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    const tool = this.registry.find(name);
    this.trace.record("tool_called", `Tool called: ${name}`, { toolName: name });
    this.exchangeLog?.record("tool_selected", {
      name,
      content: input,
    });

    try {
      const output = await tool.execute(input, this.context);
      this.trace.record("tool_completed", `Tool completed: ${name}`, {
        toolName: name,
        metadata: output.metadata ?? {},
      });
      this.exchangeLog?.record("tool_result", {
        name,
        content: output,
      });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed";
      this.trace.record("tool_failed", `Tool failed: ${name}`, {
        toolName: name,
        reason: message,
      });
      this.exchangeLog?.record("tool_error", {
        name,
        content: { reason: message },
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
