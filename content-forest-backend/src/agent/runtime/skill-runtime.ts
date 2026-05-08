import { ApplicationError, isApplicationError } from "../../shared/errors/application-error.js";
import type { SkillContract } from "../skills/skill-contract.js";
import type { AgentExchangeLogRecorder } from "./agent-exchange-log.js";
import type { AgentTask, AgentTaskContext, AgentTaskOutput } from "./agent-task.js";
import type { AgentTrace } from "./agent-trace.js";
import type {
  LlmAdapter,
  LlmCompletionInput,
  LlmCompletionResult,
} from "./llm-adapter.js";
import type { ToolRuntime } from "./tool-runtime.js";

export class SkillRegistry {
  private readonly skills = new Map<string, SkillContract>();

  public register(skill: SkillContract): void {
    const name = skill.name.trim();
    if (name.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", "Skill name cannot be blank", 400);
    }
    this.skills.set(name, skill);
  }

  public find(name: string): SkillContract {
    const skill = this.skills.get(name);
    if (skill === undefined) {
      throw new ApplicationError("NOT_FOUND", `Agent skill not found: ${name}`, 404);
    }
    return skill;
  }

  public findForTask(task: AgentTask, context: AgentTaskContext): SkillContract {
    if (task.skillName !== undefined) {
      return this.find(task.skillName);
    }

    const skill = [...this.skills.values()].find((candidate) =>
      candidate.supportedTaskTypes.includes(context.taskType),
    );

    if (skill === undefined) {
      throw new ApplicationError(
        "NOT_FOUND",
        `Agent skill not found for task type: ${context.taskType}`,
        404,
      );
    }
    return skill;
  }

  public list(): SkillContract[] {
    return [...this.skills.values()];
  }
}

export class SkillRuntime {
  private readonly registry: SkillRegistry;
  private readonly toolRuntime: ToolRuntime;
  private readonly llm: LlmAdapter;
  private readonly trace: AgentTrace;
  private readonly exchangeLog?: AgentExchangeLogRecorder;

  public constructor(dependencies: {
    registry: SkillRegistry;
    toolRuntime: ToolRuntime;
    llm: LlmAdapter;
    trace: AgentTrace;
    exchangeLog?: AgentExchangeLogRecorder;
  }) {
    this.registry = dependencies.registry;
    this.toolRuntime = dependencies.toolRuntime;
    this.llm = dependencies.llm;
    this.trace = dependencies.trace;
    this.exchangeLog = dependencies.exchangeLog;
  }

  public async executeTask(
    task: AgentTask,
    context: AgentTaskContext,
  ): Promise<AgentTaskOutput> {
    const skill = this.registry.findForTask(task, context);
    this.trace.record("skill_called", `Skill called: ${skill.name}`, {
      skillName: skill.name,
    });
    this.exchangeLog?.record({
      phase: "skill",
      direction: "input",
      name: skill.name,
      status: "started",
      content: {
        taskType: context.taskType,
        input: context.input,
        metadata: context.metadata,
      },
    });

    try {
      const output = await skill.execute({
        context,
        tools: this.toolRuntime,
        llm: new TracedLlmAdapter(this.llm, this.trace, this.exchangeLog),
        trace: this.trace,
      });
      this.exchangeLog?.record({
        phase: "skill",
        direction: "output",
        name: skill.name,
        status: "completed",
        content: output,
      });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Skill execution failed";
      this.trace.record("skill_failed", `Skill failed: ${skill.name}`, {
        skillName: skill.name,
        reason: message,
      });
      this.exchangeLog?.record({
        phase: "skill",
        direction: "error",
        name: skill.name,
        status: "failed",
        content: { reason: message },
      });

      if (isApplicationError(error)) {
        throw error;
      }

      throw new ApplicationError(
        "AGENT_SKILL_ERROR",
        `Agent skill failed: ${skill.name}`,
        500,
      );
    }
  }
}

class TracedLlmAdapter implements LlmAdapter {
  private readonly inner: LlmAdapter;
  private readonly trace: AgentTrace;
  private readonly exchangeLog?: AgentExchangeLogRecorder;

  public constructor(
    inner: LlmAdapter,
    trace: AgentTrace,
    exchangeLog?: AgentExchangeLogRecorder,
  ) {
    this.inner = inner;
    this.trace = trace;
    this.exchangeLog = exchangeLog;
  }

  public async complete(input: LlmCompletionInput): Promise<LlmCompletionResult> {
    this.trace.record("llm_called", "LLM called", {
      model: input.model,
      messageCount: input.messages.length,
    });
    this.exchangeLog?.record({
      phase: "llm",
      direction: "input",
      name: "complete",
      status: "started",
      content: input,
    });

    try {
      const output = await this.inner.complete(input);
      this.exchangeLog?.record({
        phase: "llm",
        direction: "output",
        name: "complete",
        status: "completed",
        content: output,
      });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLM call failed";
      this.trace.record("llm_failed", "LLM call failed", { reason: message });
      this.exchangeLog?.record({
        phase: "llm",
        direction: "error",
        name: "complete",
        status: "failed",
        content: { reason: message },
      });
      throw error;
    }
  }
}
