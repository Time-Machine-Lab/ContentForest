import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { AgentPort } from "../ports/agent-port.js";
import type {
  AgentTask,
  AgentTaskContext,
  AgentTaskFailureResult,
  AgentTaskResult,
  AgentTaskSuccessResult,
} from "./agent-task.js";
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
  now?: () => Date;
  nextTaskId?: () => string;
}

export class AgentRuntime implements AgentPort {
  private readonly skillRegistry: SkillRegistry;
  private readonly toolRegistry: ToolRegistry;
  private readonly outputValidator: OutputValidator;
  private readonly llm: LlmAdapter;
  private readonly now: () => Date;
  private readonly nextTaskId: () => string;

  public constructor(dependencies: AgentRuntimeDependencies) {
    this.skillRegistry = dependencies.skillRegistry ?? new SkillRegistry();
    this.toolRegistry = dependencies.toolRegistry ?? new ToolRegistry();
    this.outputValidator = dependencies.outputValidator ?? new OutputValidator();
    this.llm = dependencies.llm;
    this.now = dependencies.now ?? (() => new Date());
    this.nextTaskId = dependencies.nextTaskId ?? (() => crypto.randomUUID());
  }

  public async runTask(task: AgentTask): Promise<AgentTaskResult> {
    const taskId = task.taskId ?? this.nextTaskId();
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
        startedAt: this.now().toISOString(),
      };
      trace.record("task_started", `Agent task started: ${context.taskType}`, {
        taskId,
        taskType: context.taskType,
      });

      const toolRuntime = new ToolRuntime(this.toolRegistry, context, trace);
      const skillRuntime = new SkillRuntime({
        registry: this.skillRegistry,
        toolRuntime,
        llm: this.llm,
        trace,
      });
      const output = await skillRuntime.executeTask(task, context);
      const validatedOutput = this.outputValidator.validate(output, context);
      trace.record("output_validated", "Agent output validated", {
        taskId,
        taskType: context.taskType,
      });
      trace.record("task_completed", `Agent task completed: ${context.taskType}`, {
        taskId,
        taskType: context.taskType,
      });

      return {
        ok: true,
        taskId,
        output: validatedOutput,
        trace: trace.list(),
      } satisfies AgentTaskSuccessResult;
    } catch (error) {
      const failure = toFailure(error);
      trace.record("task_failed", "Agent task failed", {
        taskId,
        code: failure.code,
        reason: failure.message,
      });

      return {
        ok: false,
        taskId,
        error: failure,
        trace: trace.list(),
      } satisfies AgentTaskFailureResult;
    }
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
