import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentPort } from "../ports/agent-port.js";
import type {
  AgentTask,
  AgentTaskContext,
  AgentTaskFailureResult,
  AgentTaskResult,
  AgentTaskSuccessResult,
} from "./agent-task.js";
import {
  AgentExchangeLogRecorder,
  DisabledAgentExchangeLogSink,
  type AgentExchangeLogSink,
} from "./agent-exchange-log.js";
import { isAgentTaskType } from "./agent-task.js";
import { AgentTrace } from "./agent-trace.js";
import type { LlmAdapter } from "./llm-adapter.js";
import { OutputValidator } from "./output-validator.js";
import { SkillRegistry, SkillRuntime } from "./skill-runtime.js";
import { ToolRegistry } from "./tool-registry.js";
import { ToolRuntime } from "./tool-runtime.js";

export interface AgentRuntimeDependencies {
  skillRegistry?: SkillRegistry;
  toolRegistry?: ToolRegistry;
  outputValidator?: OutputValidator;
  llm: LlmAdapter;
  exchangeLogSink?: AgentExchangeLogSink;
  exchangeLogMaxContentChars?: number;
  now?: () => Date;
  nextTaskId?: () => string;
}

export class AgentRuntime implements AgentPort {
  private readonly skillRegistry: SkillRegistry;
  private readonly toolRegistry: ToolRegistry;
  private readonly outputValidator: OutputValidator;
  private readonly llm: LlmAdapter;
  private readonly exchangeLogSink: AgentExchangeLogSink;
  private readonly exchangeLogMaxContentChars: number;
  private readonly now: () => Date;
  private readonly nextTaskId: () => string;

  public constructor(dependencies: AgentRuntimeDependencies) {
    this.skillRegistry = dependencies.skillRegistry ?? new SkillRegistry();
    this.toolRegistry = dependencies.toolRegistry ?? new ToolRegistry();
    this.outputValidator = dependencies.outputValidator ?? new OutputValidator();
    this.llm = dependencies.llm;
    this.exchangeLogSink =
      dependencies.exchangeLogSink ?? new DisabledAgentExchangeLogSink();
    this.exchangeLogMaxContentChars =
      dependencies.exchangeLogMaxContentChars ?? 4000;
    this.now = dependencies.now ?? (() => new Date());
    this.nextTaskId = dependencies.nextTaskId ?? (() => crypto.randomUUID());
  }

  public async runTask(task: AgentTask): Promise<AgentTaskResult> {
    const taskId = task.taskId ?? this.nextTaskId();
    const startedAt = this.now().toISOString();
    const exchangeLog = new AgentExchangeLogRecorder({
      sink: this.exchangeLogSink,
      now: this.now,
      maxContentChars: this.exchangeLogMaxContentChars,
    });
    exchangeLog.startTask({
      taskId,
      taskType: task.type,
      startedAt,
      task,
    });
    const trace = new AgentTrace(this.now, (event) => {
      exchangeLog.record({
        phase: mapTraceTypeToExchangeLogPhase(event.type),
        direction: event.type.includes("failed") ? "error" : "info",
        name: event.type,
        status: event.type.includes("failed") ? "failed" : undefined,
        content: {
          message: event.message,
          metadata: event.metadata,
        },
      });
    });

    try {
      if (!isAgentTaskType(task.type)) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
          `Unknown agent task type: ${task.type}`,
          400,
        );
      }

      const context: AgentTaskContext = {
        taskId,
        taskType: task.type,
        input: task.input,
        metadata: task.metadata ?? {},
        startedAt,
      };
      trace.record("task_started", `Agent task started: ${context.taskType}`, {
        taskId,
        taskType: context.taskType,
      });

      const toolRuntime = new ToolRuntime(
        this.toolRegistry,
        context,
        trace,
        exchangeLog,
      );
      const skillRuntime = new SkillRuntime({
        registry: this.skillRegistry,
        toolRuntime,
        llm: this.llm,
        trace,
        exchangeLog,
      });
      const output = await skillRuntime.executeTask(task, context);
      exchangeLog.record({
        phase: "validator",
        direction: "input",
        name: "output_validator",
        status: "started",
        content: output,
      });
      const validatedOutput = this.outputValidator.validate(output, context);
      trace.record("output_validated", "Agent output validated", {
        taskId,
        taskType: context.taskType,
      });
      exchangeLog.record({
        phase: "validator",
        direction: "output",
        name: "output_validator",
        status: "completed",
        content: validatedOutput,
      });
      trace.record("task_completed", `Agent task completed: ${context.taskType}`, {
        taskId,
        taskType: context.taskType,
      });

      const result = {
        ok: true,
        taskId,
        output: validatedOutput,
        trace: trace.list(),
      } satisfies AgentTaskSuccessResult;
      await flushExchangeLog(exchangeLog, trace, result);
      return {
        ...result,
        trace: trace.list(),
      };
    } catch (error) {
      const failure = toFailure(error);
      trace.record("task_failed", "Agent task failed", {
        taskId,
        code: failure.code,
        reason: failure.message,
      });
      exchangeLog.record({
        phase: "runtime",
        direction: "error",
        name: "agent_runtime",
        status: "failed",
        content: failure,
      });

      const result = {
        ok: false,
        taskId,
        error: failure,
        trace: trace.list(),
      } satisfies AgentTaskFailureResult;
      await flushExchangeLog(exchangeLog, trace, result);
      return {
        ...result,
        trace: trace.list(),
      };
    }
  }
}

function mapTraceTypeToExchangeLogPhase(
  type: string,
): "task" | "skill" | "tool" | "llm" | "validator" | "runtime" {
  if (type.startsWith("tool_")) {
    return "tool";
  }
  if (type.startsWith("skill_")) {
    return "skill";
  }
  if (type.startsWith("llm_")) {
    return "llm";
  }
  if (type.startsWith("output_")) {
    return "validator";
  }
  if (type.startsWith("task_")) {
    return "task";
  }
  return "runtime";
}

async function flushExchangeLog(
  exchangeLog: AgentExchangeLogRecorder,
  trace: AgentTrace,
  result: AgentTaskResult,
): Promise<void> {
  try {
    await exchangeLog.flush(
      result.ok
        ? { ok: true, output: result.output }
        : { ok: false, error: result.error },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Agent exchange log write failed";
    trace.record("skill_progress", "Agent exchange log write failed", {
      stage: "agent_exchange_log_failed",
      reason: message,
    });
  }
}

function toFailure(error: unknown): { code: string; message: string } {
  if (isApplicationError(error)) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "AGENT_RUNTIME_ERROR",
    message: error instanceof Error ? error.message : "Agent runtime failed",
  };
}
