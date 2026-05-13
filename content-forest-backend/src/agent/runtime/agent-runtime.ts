import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentPort } from "../ports/agent-port.js";
import type {
  AgentTask,
  AgentTaskContext,
  AgentTaskFailureResult,
  AgentTaskResult,
  AgentTaskStreamEvent,
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
    return this.executeTask(task);
  }

  public async *streamTask(
    task: AgentTask,
  ): AsyncGenerator<AgentTaskStreamEvent, AgentTaskResult> {
    const queue = new AsyncEventQueue<AgentTaskStreamEvent, AgentTaskResult>();
    void this.executeTask(task, (event) => queue.push(event))
      .then((result) => queue.close(result))
      .catch((error) => queue.close(toRuntimeFailureResult(task, error, this.nextTaskId())));

    while (true) {
      const item = await queue.next();
      if (item.done) {
        return item.value;
      }
      yield item.value;
    }
  }

  private async executeTask(
    task: AgentTask,
    emit?: (event: AgentTaskStreamEvent) => void | Promise<void>,
  ): Promise<AgentTaskResult> {
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
    const trace = new AgentTrace(this.now);

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
      const output = await skillRuntime.executeTask(task, context, emit);
      const validatedOutput = this.outputValidator.validate(output, context);
      trace.record("output_validated", "Agent output validated", {
        taskId,
        taskType: context.taskType,
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

class AsyncEventQueue<TEvent, TResult> {
  private readonly events: TEvent[] = [];
  private waiters: Array<(value: IteratorResult<TEvent, TResult>) => void> = [];
  private completed: IteratorResult<TEvent, TResult> | null = null;

  public push(event: TEvent): void {
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      waiter({ done: false, value: event });
      return;
    }
    this.events.push(event);
  }

  public close(result: TResult): void {
    this.completed = { done: true, value: result };
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      waiter(this.completed);
    }
  }

  public async next(): Promise<IteratorResult<TEvent, TResult>> {
    const event = this.events.shift();
    if (event !== undefined) {
      return { done: false, value: event };
    }
    if (this.completed !== null) {
      return this.completed;
    }
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }
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

function toRuntimeFailureResult(
  task: AgentTask,
  error: unknown,
  taskId: string,
): AgentTaskFailureResult {
  return {
    ok: false,
    taskId: task.taskId ?? taskId,
    error: toFailure(error),
    trace: [],
  };
}
