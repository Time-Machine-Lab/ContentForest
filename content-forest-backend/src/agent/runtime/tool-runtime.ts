import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext, AgentTaskStreamEvent } from "./agent-task.js";
import type { AgentExchangeLogRecorder } from "./agent-exchange-log.js";
import type { AgentTrace } from "./agent-trace.js";
import type { ToolInput, ToolOutput } from "./tool-contract.js";
import type { ToolRegistry } from "./tool-registry.js";

export class ToolRuntime {
  private readonly registry: ToolRegistry;
  private readonly context: AgentTaskContext;
  private readonly trace: AgentTrace;
  private readonly exchangeLog?: AgentExchangeLogRecorder;
  private readonly emit?: (event: AgentTaskStreamEvent) => void | Promise<void>;

  public constructor(
    registry: ToolRegistry,
    context: AgentTaskContext,
    trace: AgentTrace,
    exchangeLog?: AgentExchangeLogRecorder,
    emit?: (event: AgentTaskStreamEvent) => void | Promise<void>,
  ) {
    this.registry = registry;
    this.context = context;
    this.trace = trace;
    this.exchangeLog = exchangeLog;
    this.emit = emit;
  }

  public async callTool(name: string, input: ToolInput): Promise<ToolOutput> {
    assertNotAborted(this.context.abortSignal);
    const tool = this.registry.find(name);
    this.trace.record("tool_called", `Tool called: ${name}`, { toolName: name });
    this.exchangeLog?.record("tool_selected", {
      name,
      content: input,
    });
    await this.emit?.({
      type: "tool_call_started",
      toolName: name,
      message: `正在调用工具：${name}`,
      metadata: summarizeToolInput(input),
    });

    try {
      const output = await tool.execute(input, this.context, {
        signal: this.context.abortSignal,
      });
      assertNotAborted(this.context.abortSignal);
      this.trace.record("tool_completed", `Tool completed: ${name}`, {
        toolName: name,
        metadata: output.metadata ?? {},
      });
      this.exchangeLog?.record("tool_result", {
        name,
        content: output,
      });
      await this.emit?.({
        type: "tool_call_completed",
        toolName: name,
        message: `工具调用完成：${name}`,
        metadata: sanitizeMetadata(output.metadata ?? {}),
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
      await this.emit?.({
        type: "tool_call_failed",
        toolName: name,
        message: `工具调用失败：${name}`,
        metadata: { reason: sanitizeString(message) },
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

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted !== true) {
    return;
  }
  throw new ApplicationError("AGENT_TASK_CANCELLED", "Agent task cancelled", 499);
}

function summarizeToolInput(input: ToolInput): Record<string, unknown> {
  return sanitizeMetadata({
    fields: Object.keys(input).sort(),
    mode: typeof input.mode === "string" ? input.mode : undefined,
    provider: typeof input.provider === "string" ? input.provider : undefined,
  });
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
      continue;
    }
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      sanitized[key] = value
        .slice(0, 8)
        .map((item) => typeof item === "string" ? sanitizeString(item) : item)
        .filter((item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          item === null
        );
    }
  }
  return sanitized;
}

function sanitizeString(value: string): string {
  return value
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, "[local-path]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[secret]")
    .slice(0, 240);
}
